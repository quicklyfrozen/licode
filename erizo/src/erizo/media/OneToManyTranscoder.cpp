/*
 * OneToManyTranscoder.cpp
 */

#include "OneToManyTranscoder.h"
#include "../WebRtcConnection.h"
#include "../RTPSink.h"
#include "rtp/RtpHeader.h"

namespace erizo {
DEFINE_LOGGER(OneToManyTranscoder, "media.OneToManyTranscoder");
OneToManyTranscoder::OneToManyTranscoder() {


	publisher = NULL;
	sentPackets_ = 0;
	ip = new InputProcessor();
	sink_ = new RTPSink("127.0.0.1", "50000");
	MediaInfo m;
	m.proccessorType = RTP_ONLY;
//	m.videoCodec.bitRate = 2000000;
//	ELOG_DEBUG("m.videoCodec.bitrate %d\n", m.videoCodec.bitRate);
	m.hasVideo = true;
	m.videoCodec.width = 640;
	m.videoCodec.height = 480;
	m.hasAudio = false;
	if (m.hasAudio) {
		m.audioCodec.sampleRate = 8000;
		m.audioCodec.bitRate = 64000;

	}
  ELOG_DEBUG("init ip");
	ip->init(m, this);

	MediaInfo om;
	om.proccessorType = RTP_ONLY;
	om.videoCodec.bitRate = 2000000;
	om.videoCodec.width = 640;
	om.videoCodec.height = 480;
	om.videoCodec.frameRate = 20;
	om.hasVideo = true;
//	om.url = "file://tmp/test.mp4";

	om.hasAudio = false;
	if (om.hasAudio) {
		om.audioCodec.sampleRate = 8000;
		om.audioCodec.bitRate = 64000;
	}

	op = new OutputProcessor();
	op->init(om, this);

}

OneToManyTranscoder::~OneToManyTranscoder() {
	this->closeAll();
	delete sink_;
}

int OneToManyTranscoder::deliverAudioData(char* buf, int len) {
	if (subscribers.empty() || len <= 0)
		return 0;

	std::map<std::string, MediaSink*>::iterator it;
	for (it = subscribers.begin(); it != subscribers.end(); it++) {
		memset(sendAudioBuffer_, 0, len);
		memcpy(sendAudioBuffer_, buf, len);
		(*it).second->deliverAudioData(sendAudioBuffer_, len);
	}

	return 0;
}

int OneToManyTranscoder::deliverVideoData(char* buf, int len) {
	memset(sendVideoBuffer_, 0, len);
	memcpy(sendVideoBuffer_, buf, len);

	RTPHeader* theHead = reinterpret_cast<RTPHeader*>(buf);
//	ELOG_DEBUG("extension %d pt %u", theHead->getExtension(),
//			theHead->getPayloadType());

	if (theHead->getPayloadType() == 100) {
		ip->deliverVideoData(sendVideoBuffer_, len);
	} else {
		this->receiveRtpData((unsigned char*) buf, len);
	}

//	if (subscribers.empty() || len <= 0)
//		return 0;
//	if (sentPackets_ % 500 == 0) {
//		publisher->sendFirPacket();
//	}
//	std::map<int, WebRtcConnection*>::iterator it;
//	for (it = subscribers.begin(); it != subscribers.end(); it++) {
//		memset(sendVideoBuffer_, 0, len);
//		memcpy(sendVideoBuffer_, buf, len);
//		(*it).second->receiveVideoData(sendVideoBuffer_, len);
//	}
//	memset(sendVideoBuffer_, 0, len);
//	memcpy(sendVideoBuffer_, buf, len);
//	sink_->sendData((unsigned char*)sendVideoBuffer_,len);

	sentPackets_++;
	return 0;
}

void OneToManyTranscoder::receiveRawData(RawDataPacket& pkt) {
//	ELOG_DEBUG("Received %d", pkt.length);
	op->receiveRawData(pkt);
}

void OneToManyTranscoder::receiveRtpData(unsigned char*rtpdata, int len) {
	ELOG_DEBUG("Received rtp data %d", len);
	memcpy(sendVideoBuffer_, rtpdata, len);

	if (subscribers.empty() || len <= 0)
		return;
//	if (sentPackets_ % 500 == 0) {
//		publisher->sendFirPacket();
//	}
	std::map<std::string, MediaSink*>::iterator it;
	for (it = subscribers.begin(); it != subscribers.end(); it++) {
		memcpy(sendVideoBuffer_, rtpdata, len);
		(*it).second->deliverVideoData(sendVideoBuffer_, len);
	}
	sentPackets_++;
}

void OneToManyTranscoder::setPublisher(MediaSource* webRtcConn) {
	this->publisher = webRtcConn;
}

void OneToManyTranscoder::addSubscriber(MediaSink* webRtcConn,
		const std::string& peerId) {
	this->subscribers[peerId] = webRtcConn;
}

  void OneToManyTranscoder::removeSubscriber(const std::string& peerId) {
    if (this->subscribers.find(peerId) != subscribers.end()) {
      delete this->subscribers[peerId];      
      this->subscribers.erase(peerId);
    }
  }

  void OneToManyTranscoder::closeAll() {
    ELOG_WARN ("OneToManyProcessor closeAll");
    std::map<std::string, MediaSink*>::iterator it;
    for (it = subscribers.begin(); it != subscribers.end(); it++) {
//      (*it).second->closeSink();
      subscribers.erase(it);
      delete (*it).second;
    }
    delete this->publisher;
  }

}/* namespace erizo */

