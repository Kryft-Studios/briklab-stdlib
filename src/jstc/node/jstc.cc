#include <napi.h>
#include <string>
#include <vector>

namespace {
std::vector<std::string> Split(const std::string& input, char delim) {
  std::vector<std::string> parts;
  std::string current;
  for (char c : input) {
    if (c == delim) {
      if (!current.empty()) parts.push_back(current);
      current.clear();
      continue;
    }
    current.push_back(c);
  }
  if (!current.empty()) parts.push_back(current);
  return parts;
}

bool IsTypeMatch(const Napi::Value& value, const std::string& expected) {
  if (expected == "string") return value.IsString();
  if (expected == "number") return value.IsNumber();
  if (expected == "boolean") return value.IsBoolean();
  if (expected == "object") return value.IsObject();
  if (expected == "function") return value.IsFunction();
  if (expected == "undefined") return value.IsUndefined();
  if (expected == "symbol") return value.IsSymbol();
  if (expected == "bigint") return value.IsBigInt();
  if (expected == "Array") return value.IsArray();
  if (expected == "string[]") {
    if (!value.IsArray()) return false;
    Napi::Array arr = value.As<Napi::Array>();
    for (uint32_t i = 0; i < arr.Length(); i++) {
      if (!arr.Get(i).IsString()) return false;
    }
    return true;
  }
  return false;
}
}  // namespace

class NativeJSTC : public Napi::ObjectWrap<NativeJSTC> {
 public:
  static Napi::FunctionReference constructor;

  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(
        env,
        "JSTypeChecker",
        {
            InstanceMethod("setProtectionLevel", &NativeJSTC::SetProtectionLevel),
            InstanceMethod("getProtectionLevel", &NativeJSTC::GetProtectionLevel),
            InstanceMethod("check", &NativeJSTC::Check),
            InstanceMethod("formatMessage", &NativeJSTC::FormatMessage),
        });
    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();
    exports.Set("JSTypeChecker", func);
    return exports;
  }

  NativeJSTC(const Napi::CallbackInfo& info) : Napi::ObjectWrap<NativeJSTC>(info) {
    protectionLevel_ = "boundary";
  }

 private:
  std::string protectionLevel_;

  Napi::Value SetProtectionLevel(const Napi::CallbackInfo& info) {
    if (info.Length() > 0 && info[0].IsString()) {
      std::string level = info[0].As<Napi::String>().Utf8Value();
      if (level == "none" || level == "boundary" || level == "sandbox" || level == "hardened") {
        protectionLevel_ = level;
      }
    }
    return info.Env().Undefined();
  }

  Napi::Value GetProtectionLevel(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), protectionLevel_);
  }

  Napi::Value Check(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsArray() || !info[1].IsArray()) {
      return Napi::Boolean::New(env, false);
    }

    Napi::Array args = info[0].As<Napi::Array>();
    Napi::Array types = info[1].As<Napi::Array>();
    if (args.Length() < types.Length()) return Napi::Boolean::New(env, false);

    for (uint32_t i = 0; i < types.Length(); i++) {
      Napi::Value value = args.Get(i);
      Napi::Value typeSpec = types.Get(i);
      bool matched = false;

      if (typeSpec.IsArray()) {
        Napi::Array arr = typeSpec.As<Napi::Array>();
        for (uint32_t j = 0; j < arr.Length(); j++) {
          Napi::Value candidate = arr.Get(j);
          if (candidate.IsString()) {
            std::vector<std::string> unions = Split(candidate.As<Napi::String>().Utf8Value(), '|');
            for (const std::string& t : unions) {
              if (IsTypeMatch(value, t)) {
                matched = true;
                break;
              }
            }
          } else if (candidate.IsFunction() && value.IsObject()) {
            matched = value.As<Napi::Object>().InstanceOf(candidate.As<Napi::Function>());
          }
          if (matched) break;
        }
      } else if (typeSpec.IsString()) {
        std::vector<std::string> unions = Split(typeSpec.As<Napi::String>().Utf8Value(), '|');
        for (const std::string& t : unions) {
          if (IsTypeMatch(value, t)) {
            matched = true;
            break;
          }
        }
      } else if (typeSpec.IsFunction() && value.IsObject()) {
        matched = value.As<Napi::Object>().InstanceOf(typeSpec.As<Napi::Function>());
      }

      if (!matched) return Napi::Boolean::New(env, false);
    }

    return Napi::Boolean::New(env, true);
  }

  Napi::Value FormatMessage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::string scope = info.Length() > 0 && info[0].IsString() ? info[0].As<Napi::String>().Utf8Value() : "JSTC";
    std::string message = info.Length() > 1 && info[1].IsString() ? info[1].As<Napi::String>().Utf8Value() : "";
    std::string hint = info.Length() > 2 && info[2].IsString() ? info[2].As<Napi::String>().Utf8Value() : "";
    std::string other = info.Length() > 3 && info[3].IsString() ? info[3].As<Napi::String>().Utf8Value() : "";

    std::string out = "[" + scope + "] @briklab/lib/jstc/native: " + message;
    if (!hint.empty()) out += "\nHint: " + hint;
    if (!other.empty()) out += "\n" + other;
    return Napi::String::New(env, out);
  }
};

Napi::FunctionReference NativeJSTC::constructor;

Napi::Value GetInfo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Object out = Napi::Object::New(env);
  out.Set("module", "jstc");
  out.Set("runtime", "node-addon-api");
  out.Set("napiVersion", Napi::Number::New(env, NAPI_VERSION));
  return out;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  NativeJSTC::Init(env, exports);
  exports.Set("getInfo", Napi::Function::New(env, GetInfo));
  return exports;
}

NODE_API_MODULE(jstc, Init)
