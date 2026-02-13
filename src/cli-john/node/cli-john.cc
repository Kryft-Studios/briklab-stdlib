#include <napi.h>
#include <string>
#include <unordered_map>
#include <vector>

struct ParseResult {
  std::string command;
  std::vector<std::string> commandArgs;
  std::vector<std::pair<std::string, std::vector<std::string>>> options;
};

class NativeCLI : public Napi::ObjectWrap<NativeCLI> {
 public:
  static Napi::FunctionReference constructor;

  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function cls = DefineClass(
        env,
        "CLI",
        {
            InstanceMethod("command", &NativeCLI::Command),
            InstanceMethod("option", &NativeCLI::Option),
            InstanceMethod("parse", &NativeCLI::Parse),
            InstanceMethod("run", &NativeCLI::Run),
            InstanceMethod("commands", &NativeCLI::Commands),
        });
    constructor = Napi::Persistent(cls);
    constructor.SuppressDestruct();
    exports.Set("CLI", cls);
    return exports;
  }

  NativeCLI(const Napi::CallbackInfo& info) : Napi::ObjectWrap<NativeCLI>(info) {}

 private:
  std::vector<std::string> commandOrder_;
  std::unordered_map<std::string, std::vector<std::string>> commandOptions_;

  ParseResult ParseArgs(const std::vector<std::string>& parts) {
    ParseResult out;
    if (parts.empty()) return out;
    out.command = parts[0];

    size_t i = 1;
    for (; i < parts.size(); i++) {
      if (parts[i].rfind("--", 0) == 0) break;
      out.commandArgs.push_back(parts[i]);
    }

    for (; i < parts.size(); i++) {
      const std::string& token = parts[i];
      if (token.rfind("--", 0) != 0) continue;
      std::vector<std::string> values;
      size_t j = i + 1;
      for (; j < parts.size(); j++) {
        if (parts[j].rfind("--", 0) == 0) break;
        values.push_back(parts[j]);
      }
      out.options.push_back({token, values});
    }
    return out;
  }

  std::vector<std::string> ExtractArgv(const Napi::Value& argvVal) {
    std::vector<std::string> out;
    if (!argvVal.IsArray()) return out;
    Napi::Array arr = argvVal.As<Napi::Array>();
    for (uint32_t i = 0; i < arr.Length(); i++) {
      Napi::Value v = arr.Get(i);
      if (v.IsString()) out.push_back(v.As<Napi::String>().Utf8Value());
    }
    return out;
  }

  Napi::Object ToJsParseResult(Napi::Env env, const ParseResult& parsed) {
    Napi::Object o = Napi::Object::New(env);
    o.Set("command", parsed.command);

    Napi::Array args = Napi::Array::New(env, parsed.commandArgs.size());
    for (size_t i = 0; i < parsed.commandArgs.size(); i++) {
      args.Set(static_cast<uint32_t>(i), parsed.commandArgs[i]);
    }
    o.Set("commandArgs", args);

    Napi::Array opts = Napi::Array::New(env, parsed.options.size());
    for (size_t i = 0; i < parsed.options.size(); i++) {
      Napi::Object opt = Napi::Object::New(env);
      opt.Set("option", parsed.options[i].first);
      Napi::Array vals = Napi::Array::New(env, parsed.options[i].second.size());
      for (size_t j = 0; j < parsed.options[i].second.size(); j++) {
        vals.Set(static_cast<uint32_t>(j), parsed.options[i].second[j]);
      }
      opt.Set("arguments", vals);
      opts.Set(static_cast<uint32_t>(i), opt);
    }
    o.Set("options", opts);
    return o;
  }

  Napi::Value Command(const Napi::CallbackInfo& info) {
    if (info.Length() < 1 || !info[0].IsString()) return info.This();
    std::string name = info[0].As<Napi::String>().Utf8Value();
    if (commandOptions_.find(name) == commandOptions_.end()) {
      commandOrder_.push_back(name);
      commandOptions_[name] = {};
    }
    return info.This();
  }

  Napi::Value Option(const Napi::CallbackInfo& info) {
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) return info.This();
    std::string cmd = info[0].As<Napi::String>().Utf8Value();
    std::string opt = info[1].As<Napi::String>().Utf8Value();
    if (commandOptions_.find(cmd) == commandOptions_.end()) {
      commandOrder_.push_back(cmd);
      commandOptions_[cmd] = {};
    }
    commandOptions_[cmd].push_back(opt);
    return info.This();
  }

  Napi::Value Parse(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::vector<std::string> argv;
    if (info.Length() > 0) argv = ExtractArgv(info[0]);
    ParseResult parsed = ParseArgs(argv);
    return ToJsParseResult(env, parsed);
  }

  Napi::Value Run(const Napi::CallbackInfo& info) {
    return Parse(info);
  }

  Napi::Value Commands(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Array arr = Napi::Array::New(env, commandOrder_.size());
    for (size_t i = 0; i < commandOrder_.size(); i++) {
      arr.Set(static_cast<uint32_t>(i), commandOrder_[i]);
    }
    return arr;
  }
};

Napi::FunctionReference NativeCLI::constructor;

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  NativeCLI::Init(env, exports);
  return exports;
}

NODE_API_MODULE(cli_john, Init)
