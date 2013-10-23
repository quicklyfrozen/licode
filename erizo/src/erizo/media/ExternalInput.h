#ifndef EXTERNALINPUT_H_
#define EXTERNALINPUT_H_

#include <string> 
#include <map>
#include <queue>
#include "../MediaDefinitions.h"
#include "codecs/VideoCodec.h"
#include "MediaProcessor.h"
#include "boost/thread.hpp"
#include "logger.h"

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
}

namespace erizo{
  class WebRtcConnection;

  class ExternalInput : public MediaSource, public RTPDataReceiver {
      DECLARE_LOGGER();
    public:
      ExternalInput (const std::string& inputUrl);
      virtual ~ExternalInput();
      int init();
      void receiveRtpData(unsigned char* rtpdata, int len);
      int sendFirPacket();
      void closeSource();


    private:
      OutputProcessor* op_;
      VideoDecoder inCodec_;
      unsigned char* decodedBuffer_;
      char* sendVideoBuffer_;

      std::string url_;
      bool running_;
	    boost::mutex queueMutex_;
      boost::thread thread_, encodeThread_;
      std::queue<RawDataPacket> packetQueue_;
      AVFormatContext* context_;
      AVPacket avpacket_;
      int video_stream_index_, bufflen_;


      void receiveLoop();
      void encodeLoop();

  };
}
#endif /* EXTERNALINPUT_H_ */
