#include <napi.h>
#include <algorithm>
#include <cmath>
#include <sstream>
#include <string>

namespace {
int ClampInt(int value, int min, int max) {
  return std::max(min, std::min(max, value));
}

double ClampDouble(double value, double min, double max) {
  return std::max(min, std::min(max, value));
}

std::string ToHexChannel(int v) {
  static const char* digits = "0123456789abcdef";
  std::string out(2, '0');
  out[0] = digits[(v >> 4) & 0x0F];
  out[1] = digits[v & 0x0F];
  return out;
}

void HslToRgb(double h, double s, double l, int& r, int& g, int& b) {
  s /= 100.0;
  l /= 100.0;
  auto k = [h](double n) { return std::fmod((n + h / 30.0), 12.0); };
  double a = s * std::min(l, 1.0 - l);
  auto f = [&](double n) {
    return l - a * std::max(-1.0, std::min({k(n) - 3.0, 9.0 - k(n), 1.0}));
  };
  r = static_cast<int>(std::round(f(0) * 255.0));
  g = static_cast<int>(std::round(f(8) * 255.0));
  b = static_cast<int>(std::round(f(4) * 255.0));
}

void RgbToHsl(int r, int g, int b, int& h, int& s, int& l) {
  double rd = r / 255.0;
  double gd = g / 255.0;
  double bd = b / 255.0;
  double maxv = std::max({rd, gd, bd});
  double minv = std::min({rd, gd, bd});
  double hd = 0.0;
  double sd = 0.0;
  double ld = (maxv + minv) / 2.0;

  if (maxv != minv) {
    double d = maxv - minv;
    sd = ld > 0.5 ? d / (2.0 - maxv - minv) : d / (maxv + minv);
    if (maxv == rd) {
      hd = (gd - bd) / d + (gd < bd ? 6.0 : 0.0);
    } else if (maxv == gd) {
      hd = (bd - rd) / d + 2.0;
    } else {
      hd = (rd - gd) / d + 4.0;
    }
    hd *= 60.0;
  }

  h = static_cast<int>(std::round(hd));
  s = static_cast<int>(std::round(sd * 100.0));
  l = static_cast<int>(std::round(ld * 100.0));
}

int RgbToAnsi256Index(int r, int g, int b) {
  if (r == g && g == b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return static_cast<int>(std::round(((r - 8) / 247.0) * 24.0)) + 232;
  }
  auto to6 = [](int v) { return static_cast<int>(std::round((v / 255.0) * 5.0)); };
  return 16 + 36 * to6(r) + 6 * to6(g) + to6(b);
}
}  // namespace

class NativeColor : public Napi::ObjectWrap<NativeColor> {
 public:
  static Napi::FunctionReference constructor;

  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(
        env,
        "Color",
        {
            InstanceMethod("hex", &NativeColor::Hex),
            InstanceMethod("rgb", &NativeColor::Rgb),
            InstanceMethod("rgba", &NativeColor::Rgba),
            InstanceMethod("hsl", &NativeColor::Hsl),
            InstanceMethod("hsla", &NativeColor::Hsla),
            InstanceMethod("css", &NativeColor::Css),
            InstanceMethod("ansiTruecolor", &NativeColor::AnsiTruecolor),
            InstanceMethod("ansiTruecolorBg", &NativeColor::AnsiTruecolorBg),
            InstanceMethod("ansi256", &NativeColor::Ansi256),
            InstanceMethod("ansi256Bg", &NativeColor::Ansi256Bg),
            InstanceMethod("wrapAnsi", &NativeColor::WrapAnsi),
        });
    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();
    exports.Set("Color", func);
    return exports;
  }

  NativeColor(const Napi::CallbackInfo& info) : Napi::ObjectWrap<NativeColor>(info) {
    r_ = 0;
    g_ = 0;
    b_ = 0;
    a_ = 1.0;
    if (info.Length() < 1) return;

    Napi::Value input = info[0];
    if (input.IsString()) {
      ParseString(input.As<Napi::String>().Utf8Value());
      return;
    }

    if (input.IsObject()) {
      Napi::Object obj = input.As<Napi::Object>();
      bool hasRgb = obj.Has("r") && obj.Has("g") && obj.Has("b");
      bool hasHsl = obj.Has("h") && obj.Has("s") && obj.Has("l");
      if (hasRgb) {
        r_ = ClampInt(obj.Get("r").ToNumber().Int32Value(), 0, 255);
        g_ = ClampInt(obj.Get("g").ToNumber().Int32Value(), 0, 255);
        b_ = ClampInt(obj.Get("b").ToNumber().Int32Value(), 0, 255);
        if (obj.Has("a")) a_ = ClampDouble(obj.Get("a").ToNumber().DoubleValue(), 0.0, 1.0);
      } else if (hasHsl) {
        int h = obj.Get("h").ToNumber().Int32Value();
        int s = obj.Get("s").ToNumber().Int32Value();
        int l = obj.Get("l").ToNumber().Int32Value();
        HslToRgb(h, s, l, r_, g_, b_);
        if (obj.Has("a")) a_ = ClampDouble(obj.Get("a").ToNumber().DoubleValue(), 0.0, 1.0);
      }
    }
  }

 private:
  int r_;
  int g_;
  int b_;
  double a_;

  void ParseString(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), ::tolower);
    value.erase(0, value.find_first_not_of(" \n\r\t"));
    value.erase(value.find_last_not_of(" \n\r\t") + 1);

    if (value == "red") value = "#ff0000";
    if (value == "blue") value = "#0000ff";
    if (value == "green") value = "#00ff00";
    if (value == "yellow") value = "#ffff00";
    if (value == "orange") value = "#ffa500";
    if (value == "black") value = "#000000";
    if (value == "white") value = "#ffffff";
    if (value == "gray") value = "#808080";

    if (value.size() > 0 && value[0] == '#') {
      std::string hex = value.substr(1);
      if (hex.size() == 3) {
        r_ = std::stoi(std::string(2, hex[0]), nullptr, 16);
        g_ = std::stoi(std::string(2, hex[1]), nullptr, 16);
        b_ = std::stoi(std::string(2, hex[2]), nullptr, 16);
      } else if (hex.size() == 6) {
        r_ = std::stoi(hex.substr(0, 2), nullptr, 16);
        g_ = std::stoi(hex.substr(2, 2), nullptr, 16);
        b_ = std::stoi(hex.substr(4, 2), nullptr, 16);
      }
      return;
    }
  }

  Napi::Value Hex(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), "#" + ToHexChannel(r_) + ToHexChannel(g_) + ToHexChannel(b_));
  }
  Napi::Value Rgb(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), "rgb(" + std::to_string(r_) + ", " + std::to_string(g_) + ", " + std::to_string(b_) + ")");
  }
  Napi::Value Rgba(const Napi::CallbackInfo& info) {
    std::ostringstream out;
    out << "rgba(" << r_ << ", " << g_ << ", " << b_ << ", " << a_ << ")";
    return Napi::String::New(info.Env(), out.str());
  }
  Napi::Value Hsl(const Napi::CallbackInfo& info) {
    int h = 0, s = 0, l = 0;
    RgbToHsl(r_, g_, b_, h, s, l);
    return Napi::String::New(info.Env(), "hsl(" + std::to_string(h) + ", " + std::to_string(s) + "%, " + std::to_string(l) + "%)");
  }
  Napi::Value Hsla(const Napi::CallbackInfo& info) {
    int h = 0, s = 0, l = 0;
    RgbToHsl(r_, g_, b_, h, s, l);
    std::ostringstream out;
    out << "hsla(" << h << ", " << s << "%, " << l << "%, " << a_ << ")";
    return Napi::String::New(info.Env(), out.str());
  }
  Napi::Value Css(const Napi::CallbackInfo& info) {
    if (a_ == 1.0) return Hex(info);
    return Rgba(info);
  }
  Napi::Value AnsiTruecolor(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), "\x1b[38;2;" + std::to_string(r_) + ";" + std::to_string(g_) + ";" + std::to_string(b_) + "m");
  }
  Napi::Value AnsiTruecolorBg(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), "\x1b[48;2;" + std::to_string(r_) + ";" + std::to_string(g_) + ";" + std::to_string(b_) + "m");
  }
  Napi::Value Ansi256(const Napi::CallbackInfo& info) {
    int idx = RgbToAnsi256Index(r_, g_, b_);
    return Napi::String::New(info.Env(), "\x1b[38;5;" + std::to_string(idx) + "m");
  }
  Napi::Value Ansi256Bg(const Napi::CallbackInfo& info) {
    int idx = RgbToAnsi256Index(r_, g_, b_);
    return Napi::String::New(info.Env(), "\x1b[48;5;" + std::to_string(idx) + "m");
  }
  Napi::Value WrapAnsi(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::string text = info.Length() > 0 && info[0].IsString() ? info[0].As<Napi::String>().Utf8Value() : "";
    bool background = false;
    bool use256 = false;
    bool bold = false;
    bool underline = false;
    if (info.Length() > 1 && info[1].IsObject()) {
      Napi::Object opts = info[1].As<Napi::Object>();
      if (opts.Has("background")) background = opts.Get("background").ToBoolean().Value();
      if (opts.Has("use256")) use256 = opts.Get("use256").ToBoolean().Value();
      if (opts.Has("bold")) bold = opts.Get("bold").ToBoolean().Value();
      if (opts.Has("underline")) underline = opts.Get("underline").ToBoolean().Value();
    }
    std::string seq;
    if (background) {
      seq = use256 ? Ansi256Bg(info).ToString().Utf8Value() : AnsiTruecolorBg(info).ToString().Utf8Value();
    } else {
      seq = use256 ? Ansi256(info).ToString().Utf8Value() : AnsiTruecolor(info).ToString().Utf8Value();
    }
    std::string mods;
    if (bold) mods += "\x1b[1m";
    if (underline) mods += "\x1b[4m";
    return Napi::String::New(env, mods + seq + text + "\x1b[0m");
  }
};

Napi::FunctionReference NativeColor::constructor;

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  NativeColor::Init(env, exports);
  return exports;
}

NODE_API_MODULE(color, Init)
