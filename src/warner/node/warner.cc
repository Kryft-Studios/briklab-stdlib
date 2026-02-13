#include <napi.h>
#include <cstdio>
#include <string>
#include <vector>

struct NativeWarning {
  std::string message;
  std::string source;
  std::string hint;
  bool instantlyWarn;
};

class NativeWarner : public Napi::ObjectWrap<NativeWarner> {
 public:
  static Napi::FunctionReference constructor;

  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(
        env,
        "Warner",
        {
            InstanceMethod("setLevel", &NativeWarner::SetLevel),
            InstanceMethod("clear", &NativeWarner::Clear),
            InstanceMethod("count", &NativeWarner::Count),
            InstanceMethod("warn", &NativeWarner::Warn),
            InstanceMethod("flush", &NativeWarner::Flush),
            InstanceMethod("warnings", &NativeWarner::Warnings),
            InstanceMethod("formatWarning", &NativeWarner::FormatWarning),
        });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();
    exports.Set("Warner", func);
    return exports;
  }

  NativeWarner(const Napi::CallbackInfo& info) : Napi::ObjectWrap<NativeWarner>(info) {
    level_ = "summary";
    maxWarnings_ = 20;
    if (info.Length() > 0 && info[0].IsObject()) {
      Napi::Object options = info[0].As<Napi::Object>();
      if (options.Has("level") && options.Get("level").IsString()) {
        level_ = options.Get("level").As<Napi::String>().Utf8Value();
      }
      if (options.Has("maxWarnings") && options.Get("maxWarnings").IsNumber()) {
        maxWarnings_ = options.Get("maxWarnings").As<Napi::Number>().Uint32Value();
      }
      if (options.Has("packageName") && options.Get("packageName").IsString()) {
        packageName_ = options.Get("packageName").As<Napi::String>().Utf8Value();
      }
    }
  }

 private:
  std::string level_;
  std::string packageName_;
  uint32_t maxWarnings_;
  std::vector<NativeWarning> warnings_;

  Napi::Value SetLevel(const Napi::CallbackInfo& info) {
    if (info.Length() > 0 && info[0].IsString()) {
      std::string next = info[0].As<Napi::String>().Utf8Value();
      if (next == "silent" || next == "summary" || next == "full") {
        level_ = next;
      }
    }
    return info.Env().Undefined();
  }

  Napi::Value Clear(const Napi::CallbackInfo& info) {
    warnings_.clear();
    return info.Env().Undefined();
  }

  Napi::Value Count(const Napi::CallbackInfo& info) {
    return Napi::Number::New(info.Env(), static_cast<double>(warnings_.size()));
  }

  std::string ComposeMessage(const NativeWarning& w) const {
    std::string out;
    if (!w.source.empty()) out += "[" + w.source + "] ";
    if (!packageName_.empty()) out += packageName_ + ": ";
    out += w.message;
    if (!w.hint.empty()) out += "\nHint: " + w.hint;
    return out;
  }

  Napi::Value FormatWarning(const Napi::CallbackInfo& info) {
    NativeWarning w;
    w.message = info.Length() > 0 && info[0].IsString() ? info[0].As<Napi::String>().Utf8Value() : "";
    w.hint = info.Length() > 1 && info[1].IsString() ? info[1].As<Napi::String>().Utf8Value() : "";
    w.source = info.Length() > 2 && info[2].IsString() ? info[2].As<Napi::String>().Utf8Value() : "";
    return Napi::String::New(info.Env(), ComposeMessage(w));
  }

  Napi::Value Warn(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsObject()) return env.Undefined();

    Napi::Object warning = info[0].As<Napi::Object>();
    NativeWarning w;
    w.message = warning.Has("message") && warning.Get("message").IsString()
      ? warning.Get("message").As<Napi::String>().Utf8Value()
      : "";
    w.source = warning.Has("source") && warning.Get("source").IsString()
      ? warning.Get("source").As<Napi::String>().Utf8Value()
      : "";
    w.hint = warning.Has("hint") && warning.Get("hint").IsString()
      ? warning.Get("hint").As<Napi::String>().Utf8Value()
      : "";
    w.instantlyWarn = warning.Has("instantlyWarn") && warning.Get("instantlyWarn").ToBoolean().Value();

    if (warnings_.size() < maxWarnings_) warnings_.push_back(w);
    if (w.instantlyWarn && level_ != "silent") {
      std::string line = ComposeMessage(w);
      fprintf(stderr, "%s\n", line.c_str());
    }
    return env.Undefined();
  }

  Napi::Value Warnings(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Array arr = Napi::Array::New(env, warnings_.size());
    for (size_t i = 0; i < warnings_.size(); i++) {
      const NativeWarning& w = warnings_[i];
      Napi::Object o = Napi::Object::New(env);
      o.Set("message", w.message);
      o.Set("source", w.source);
      o.Set("hint", w.hint);
      o.Set("instantlyWarn", w.instantlyWarn);
      arr.Set(static_cast<uint32_t>(i), o);
    }
    return arr;
  }

  Napi::Value Flush(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (level_ == "full") {
      for (const NativeWarning& w : warnings_) {
        if (!w.instantlyWarn) {
          std::string line = ComposeMessage(w);
          fprintf(stderr, "%s\n", line.c_str());
        }
      }
    } else if (level_ == "summary") {
      std::string summary = "[SUMMARY] " + std::to_string(warnings_.size()) + " warnings collected";
      fprintf(stderr, "%s\n", summary.c_str());
    }
    return Napi::Number::New(env, static_cast<double>(warnings_.size()));
  }
};

Napi::FunctionReference NativeWarner::constructor;

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  NativeWarner::Init(env, exports);
  return exports;
}

NODE_API_MODULE(warner, Init)
