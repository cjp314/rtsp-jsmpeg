var videoStream = require("./videoStream");

stream = new videoStream({
  name: "test",
  wsPort: 9999,
  ffmpegOptions: {
    // options ffmpeg flags
    "-r": 25,
    "-s": "352x288"
  }
});
