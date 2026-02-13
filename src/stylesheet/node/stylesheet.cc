#include <napi.h>
#include <string>
#include <unordered_map>
#include <vector>

class NativeInlineStyle : public Napi::ObjectWrap<NativeInlineStyle> {
 public:
  static Napi::FunctionReference constructor;
  static Napi::Function GetClass(Napi::Env env) {
    return DefineClass(
        env,
        "InlineStyle",
        {
            InstanceMethod("generate", &NativeInlineStyle::Generate),
            InstanceMethod("addStyleWithObject", &NativeInlineStyle::AddStyleWithObject),
            InstanceMethod("addStyleWithInlineCSS", &NativeInlineStyle::AddStyleWithInlineCss),
            InstanceMethod("removeStyle", &NativeInlineStyle::RemoveStyle),
            InstanceMethod("text", &NativeInlineStyle::Text),
        });
  }

  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function cls = GetClass(env);
    constructor = Napi::Persistent(cls);
    constructor.SuppressDestruct();
    exports.Set("InlineStyle", cls);
    return exports;
  }

  NativeInlineStyle(const Napi::CallbackInfo& info) : Napi::ObjectWrap<NativeInlineStyle>(info) {
    if (info.Length() > 0 && info[0].IsObject()) {
      ParseObject(info[0].As<Napi::Object>());
    }
  }

  std::string GenerateCss() const {
    std::string out;
    for (auto it = styles_.begin(); it != styles_.end(); ++it) {
      out += it->first + ":" + it->second + ";";
    }
    return out;
  }

 private:
  std::unordered_map<std::string, std::string> styles_;

  void ParseObject(const Napi::Object& obj) {
    Napi::Array keys = obj.GetPropertyNames();
    for (uint32_t i = 0; i < keys.Length(); i++) {
      std::string key = keys.Get(i).ToString().Utf8Value();
      std::string val = obj.Get(key).ToString().Utf8Value();
      styles_[key] = val;
    }
  }

  void ParseInlineCss(const std::string& css) {
    size_t start = 0;
    while (start < css.size()) {
      size_t end = css.find(';', start);
      if (end == std::string::npos) end = css.size();
      std::string segment = css.substr(start, end - start);
      size_t colon = segment.find(':');
      if (colon != std::string::npos) {
        std::string key = segment.substr(0, colon);
        std::string val = segment.substr(colon + 1);
        if (!key.empty() && !val.empty()) styles_[key] = val;
      }
      start = end + 1;
    }
  }

  Napi::Value Generate(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), GenerateCss());
  }

  Napi::Value Text(const Napi::CallbackInfo& info) {
    return Generate(info);
  }

  Napi::Value AddStyleWithObject(const Napi::CallbackInfo& info) {
    if (info.Length() > 0 && info[0].IsObject()) ParseObject(info[0].As<Napi::Object>());
    return info.This();
  }

  Napi::Value AddStyleWithInlineCss(const Napi::CallbackInfo& info) {
    if (info.Length() > 0 && info[0].IsString()) ParseInlineCss(info[0].As<Napi::String>().Utf8Value());
    return info.This();
  }

  Napi::Value RemoveStyle(const Napi::CallbackInfo& info) {
    if (info.Length() < 1) return info.This();
    if (info[0].IsString()) {
      styles_.erase(info[0].As<Napi::String>().Utf8Value());
    } else if (info[0].IsArray()) {
      Napi::Array arr = info[0].As<Napi::Array>();
      for (uint32_t i = 0; i < arr.Length(); i++) {
        styles_.erase(arr.Get(i).ToString().Utf8Value());
      }
    }
    return info.This();
  }
};

class NativeStyleSheet : public Napi::ObjectWrap<NativeStyleSheet> {
 public:
  static Napi::FunctionReference constructor;

  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function cls = DefineClass(
        env,
        "StyleSheet",
        {
            InstanceMethod("set", &NativeStyleSheet::Set),
            InstanceMethod("get", &NativeStyleSheet::Get),
            InstanceMethod("remove", &NativeStyleSheet::Remove),
            InstanceMethod("generate", &NativeStyleSheet::Generate),
            InstanceMethod("toString", &NativeStyleSheet::ToStringValue),
        });
    constructor = Napi::Persistent(cls);
    constructor.SuppressDestruct();
    exports.Set("StyleSheet", cls);
    return exports;
  }

  NativeStyleSheet(const Napi::CallbackInfo& info) : Napi::ObjectWrap<NativeStyleSheet>(info) {}

 private:
  std::unordered_map<std::string, std::string> rules_;

  Napi::Value Set(const Napi::CallbackInfo& info) {
    if (info.Length() < 2 || !info[0].IsString()) return info.This();
    std::string key = info[0].As<Napi::String>().Utf8Value();
    std::string css;
    if (info[1].IsString()) {
      css = info[1].As<Napi::String>().Utf8Value();
    } else if (info[1].IsObject()) {
      Napi::Object maybeStyle = info[1].As<Napi::Object>();
      if (maybeStyle.Has("generate") && maybeStyle.Get("generate").IsFunction()) {
        Napi::Function fn = maybeStyle.Get("generate").As<Napi::Function>();
        css = fn.Call(maybeStyle, {}).ToString().Utf8Value();
      } else {
        Napi::Array keys = maybeStyle.GetPropertyNames();
        for (uint32_t i = 0; i < keys.Length(); i++) {
          std::string k = keys.Get(i).ToString().Utf8Value();
          css += k + ":" + maybeStyle.Get(k).ToString().Utf8Value() + ";";
        }
      }
    }
    rules_[key] = css;
    return info.This();
  }

  Napi::Value Get(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) return env.Undefined();
    std::string key = info[0].As<Napi::String>().Utf8Value();
    auto it = rules_.find(key);
    if (it == rules_.end()) return env.Undefined();
    return Napi::String::New(env, it->second);
  }

  Napi::Value Remove(const Napi::CallbackInfo& info) {
    if (info.Length() > 0 && info[0].IsString()) {
      rules_.erase(info[0].As<Napi::String>().Utf8Value());
    }
    return info.This();
  }

  Napi::Value Generate(const Napi::CallbackInfo& info) {
    std::string out;
    for (auto it = rules_.begin(); it != rules_.end(); ++it) {
      out += it->first + " { " + it->second + " }\n";
    }
    return Napi::String::New(info.Env(), out);
  }

  Napi::Value ToStringValue(const Napi::CallbackInfo& info) {
    return Generate(info);
  }
};

Napi::FunctionReference NativeInlineStyle::constructor;
Napi::FunctionReference NativeStyleSheet::constructor;

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  NativeInlineStyle::Init(env, exports);
  NativeStyleSheet::Init(env, exports);
  return exports;
}

NODE_API_MODULE(stylesheet, Init)
