{
  "targets": [
    {
      "target_name": "warner",
      "sources": ["warner.cc"],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        [
          "OS==\"win\"",
          {
            "msvs_settings": {
              "VCCLCompilerTool": {
                "AdditionalOptions": ["/std:c++17"]
              }
            }
          }
        ],
        [
          "OS!=\"win\"",
          {
            "cflags_cc": ["-std=c++17"]
          }
        ]
      ]
    }
  ]
}
