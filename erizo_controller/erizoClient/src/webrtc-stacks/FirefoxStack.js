/*global window, console, RTCSessionDescription, RoapConnection, webkitRTCPeerConnection*/

var Erizo = Erizo || {};

Erizo.FirefoxStack = function (spec) {
    "use strict";

    var that = {},
        RTCPeerConnection = mozRTCPeerConnection;

    that.pc_config = {
        "iceServers": []
    };

    that.mediaConstraints = {
        'mandatory': {
            'OfferToReceiveVideo': 'true',
            'OfferToReceiveAudio': 'true'
        }
    };

    that.peerConnection = new RTCPeerConnection();

    that.peerConnection.onicecandidate = function (event) {
        console.log("On ice candidate", event);
        if (!event.candidate) {
            // At the moment, we do not renegotiate when new candidates
            // show up after the more flag has been false once.
            that.moreIceComing = false;
            that.markActionNeeded();
        } else {
            that.iceCandidateCount += 1;
        }
    };

    console.log("Created RTCPeerConnnection with config \"" + JSON.stringify(that.pc_config) + "\".");

    /**
     * This function processes signalling messages from the other side.
     * @param {string} msgstring JSON-formatted string containing a ROAP message.
     */
    that.processSignalingMessage = function (msgstring) {
        // Offer: Check for glare and resolve.
        // Answer/OK: Remove retransmit for the msg this is an answer to.
        // Send back "OK" if this was an Answer.
        console.log('Activity on conn ' + that.sessionId);
        var msg = JSON.parse(msgstring), sd;
        that.incomingMessage = msg;

        if (that.state === 'new') {
            if (msg.messageType === 'OFFER') {
                // Initial offer.
                sd = {
                    sdp: msg.sdp,
                    type: 'offer'
                };
                that.peerConnection.setRemoteDescription(new mozRTCSessionDescription(sd));

                that.state = 'offer-received';
                // Allow other stuff to happen, then reply.
                that.markActionNeeded();
            } else {
                that.error('Illegal message for this state: ' + msg.messageType + ' in state ' + that.state);
            }

        } else if (that.state === 'offer-sent') {
            if (msg.messageType === 'ANSWER') {

                var sdp = msg.sdp;

                sdp = sdp.replace(/a=ssrc.*\r\n/g, '');
                sdp = sdp.replace(/s=\r\n/g, 's=SIP Call\r\n');
                sdp = sdp.replace(/a=rtpmap:109 opus\/48000\r\n/g, 'a=rtpmap:109 opus/48000/2\r\na=ptime:20\r\n');
                sdp = sdp.replace(/a=rtpmap:101 telephone-event\/8000\r\n/g, 'a=rtpmap:101 telephone-event/8000\r\na=fmtp:101 0-15\r\n');
                sdp = sdp.replace(/a=mid:.*\r\n/g, '');
                sdp = sdp.replace(/a=rtcp:.*\r\n/g, '');
                sdp = sdp.replace(/109 0 8 101/g, '109 101');
                sdp = sdp.replace(/a=rtpmap:0.*\r\n/g, '');
                sdp = sdp.replace(/a=rtpmap:8.*\r\n/g, '');
                sdp = sdp.replace(/ udp /g, ' UDP ');
                var ufrag = sdp.match(/a=ice-ufrag:(.*)\r\n/g)[0];
                var pwd = sdp.match(/a=ice-pwd:(.*)\r\n/g)[0];
                sdp = sdp.replace(/a=ice-ufrag.*\r\n/g, '');
                sdp = sdp.replace(/a=ice-pwd.*\r\n/g, '');
                sdp = sdp.replace(/t=0 0\r\n/g, 't=0 0\r\n'+ufrag+pwd+'a=fingerprint:sha-256 57:10:1A:CF:95:65:5A:BF:2B:27:E0:5B:D8:EF:D8:9F:AE:A8:A5:A1:0B:C6:DC:3C:46:E6:3E:B6:CB:DC:20:46\r\n');
                //sdp = sdp.replace(/t=0 0\r\n/g, 't=0 0\r\na=fingerprint:sha-256 57:10:1A:CF:95:65:5A:BF:2B:27:E0:5B:D8:EF:D8:9F:AE:A8:A5:A1:0B:C6:DC:3C:46:E6:3E:B6:CB:DC:20:46\r\n');
                sdp = sdp.replace(/ generation 0/g, '');


                sdp += "m=application 52303 SCTP/DTLS 5001\r\nc=IN IP4 81.61.55.239\r\na=sendrecv\r\na=candidate:0 1 UDP 2113667327 192.168.0.14 52303 typ host\r\na=candidate:1 1 UDP 1694302207 81.61.55.239 52303 typ srflx raddr 192.168.0.14 rport 52303\r\na=candidate:0 2 UDP 2113667326 192.168.0.14 49587 typ host\r\na=candidate:1 2 UDP 1694302206 81.61.55.239 49587 typ srflx raddr 192.168.0.14 rport 49587";

                sd = {
                    sdp: sdp,
                    type: 'answer'
                };
                console.log("Setting remote description.", sdp);
                that.peerConnection.setRemoteDescription(new mozRTCSessionDescription(sd));
                that.sendOK();
                that.state = 'established';

            } else if (msg.messageType === 'pr-answer') {
                sd = {
                    sdp: msg.sdp,
                    type: 'pr-answer'
                };
                that.peerConnection.setRemoteDescription(new mozRTCSessionDescription(sd));

                // No change to state, and no response.
            } else if (msg.messageType === 'offer') {
                // Glare processing.
                that.error('Not written yet');
            } else {
                that.error('Illegal message for this state: ' + msg.messageType + ' in state ' + that.state);
            }

        } else if (that.state === 'established') {
            if (msg.messageType === 'OFFER') {
                // Subsequent offer.
                sd = {
                    sdp: msg.sdp,
                    type: 'offer'
                };
                that.peerConnection.setRemoteDescription(new RTCSessionDescription(sd));

                that.state = 'offer-received';
                // Allow other stuff to happen, then reply.
                that.markActionNeeded();
            } else {
                that.error('Illegal message for this state: ' + msg.messageType + ' in state ' + that.state);
            }
        }
    };

    /**
     * Adds a stream - this causes signalling to happen, if needed.
     * @param {MediaStream} stream The outgoing MediaStream to add.
     */
    that.addStream = function (stream) {
        that.peerConnection.addStream(stream);
        that.state = "new";
        that.markActionNeeded();
    };

    /**
     * Removes a stream.
     * @param {MediaStream} stream The MediaStream to remove.
     */
    that.removeStream = function (stream) {
//        var i;
//        for (i = 0; i < that.peerConnection.localStreams.length; ++i) {
//            if (that.localStreams[i] === stream) {
//                that.localStreams[i] = null;
//            }
//        }
        that.markActionNeeded();
    };

    /**
     * Closes the connection.
     */
    that.close = function () {
        that.state = 'closed';
        that.peerConnection.close();
    };

    /**
     * Internal function: Mark that something happened.
     */
    that.markActionNeeded = function () {
        that.actionNeeded = true;
        that.doLater(function () {
            that.onstablestate();
        });
    };

    /**
     * Internal function: Do something later (not on this stack).
     * @param {function} what Callback to be executed later.
     */
    that.doLater = function (what) {
        // Post an event to myself so that I get called a while later.
        // (needs more JS/DOM info. Just call the processing function on a delay
        // for now.)
        window.setTimeout(what, 1);
    };

    /**
     * Internal function called when a stable state
     * is entered by the browser (to allow for multiple AddStream calls or
     * other interesting actions).
     * This function will generate an offer or answer, as needed, and send
     * to the remote party using our onsignalingmessage function.
     */
    that.onstablestate = function () {
        var mySDP,
            roapMessage = {};
        if (that.actionNeeded) {
            if (that.state === 'new' || that.state === 'established') {
                // See if the current offer is the same as what we already sent.
                // If not, no change is needed.   
                console.log("Creating offer");
                that.peerConnection.createOffer(function (sessionDescription) {
                    console.log("New Offer! ", sessionDescription.sdp);
                    
                    var sdp = sessionDescription.sdp;
                    sdp = sdp.replace(/a=ssrc.*\r\n/g, '');
                    var ufrag = sdp.match(/a=ice-ufrag:(.*)\r\n/)[1];
                    var pwd = sdp.match(/a=ice-pwd:(.*)\r\n/)[1];
                    //ufrag = String.fromCharCode(parseInt(ufrag, 16));
                    //pwd = String.fromCharCode(parseInt(pwd, 16));
                    var iceufrag = 'a=ice-ufrag:' + ufrag + '\r\n';
                    var icepwd = 'a=ice-pwd:' + pwd + '\r\n';
                    console.log("ufrag:",ufrag);
                    console.log("pwd:",pwd);

                    sdp = sdp.replace(/a=ice-ufrag.*\r\n/g, '');
                    sdp = sdp.replace(/a=ice-pwd.*\r\n/g, '');
                    sdp = sdp.replace(/8 101\r\n/g, '8 101\r\n'+iceufrag+icepwd);
                    sdp = sdp.replace(/SAVPF 120\r\n/g, 'SAVPF 120\r\n'+iceufrag+icepwd);
                    sessionDescription.sdp = sdp;
                    var newOffer = sessionDescription.sdp;

                    that.localDescription = sessionDescription;

                    if (newOffer !== that.prevOffer) {

                        that.peerConnection.setLocalDescription(sessionDescription, function() {
                            console.log("Ok!");
                            that.state = 'preparing-offer';
                            that.moreIceComing = false;
                            that.markActionNeeded();
                            console.log("Local description set.");
                        }, function() {
                            console.log("Error");
                        });
                        
                        
                        return;
                    } else {
                        console.log('Not sending a new offer');
                    }

                }, function(error) {
                    console.log("Error creating offer : ", error);
                });


            } else if (that.state === 'preparing-offer') {
                // Don't do anything until we have the ICE candidates.
                if (that.moreIceComing) {
                    return;
                }
                // Now able to send the offer we've already prepared.
                that.prevOffer = that.localDescription.sdp;
                console.log("Sending OFFER: ", that.prevOffer);
                //console.log('Sent SDP is ' + that.prevOffer);
                that.sendMessage('OFFER', that.prevOffer);
                // Not done: Retransmission on non-response.
                that.state = 'offer-sent';

            } else if (that.state === 'offer-received') {

                that.peerConnection.createAnswer(function (sessionDescription) {

                    that.peerConnection.setLocalDescription(sessionDescription);
                    that.state = 'offer-received-preparing-answer';

                    if (!that.iceStarted) {
                        var now = new Date();
                        console.log(now.getTime() + ': Starting ICE in responder');
                        that.iceStarted = true;
                    } else {
                        that.markActionNeeded();
                        return;
                    }

                }, null, that.mediaConstraints);

            } else if (that.state === 'offer-received-preparing-answer') {
                if (that.moreIceComing) {
                    return;
                }

                mySDP = that.peerConnection.localDescription.sdp;

                that.sendMessage('ANSWER', mySDP);
                that.state = 'established';
            } else {
                //that.error('Dazed and confused in state ' + that.state + ', stopping here');
            }
            that.actionNeeded = false;
        }
    };

    /**
     * Internal function to send an "OK" message.
     */
    that.sendOK = function () {
        that.sendMessage('OK');
    };

    /**
     * Internal function to send a signalling message.
     * @param {string} operation What operation to signal.
     * @param {string} sdp SDP message body.
     */
    that.sendMessage = function (operation, sdp) {
        var roapMessage = {};
        roapMessage.messageType = operation;
        roapMessage.sdp = sdp; // may be null or undefined
        if (operation === 'OFFER') {
            roapMessage.offererSessionId = that.sessionId;
            roapMessage.answererSessionId = that.otherSessionId; // may be null
            roapMessage.seq = (that.sequenceNumber += 1);
            // The tiebreaker needs to be neither 0 nor 429496725.
            roapMessage.tiebreaker = Math.floor(Math.random() * 429496723 + 1);
        } else {
            roapMessage.offererSessionId = that.incomingMessage.offererSessionId;
            roapMessage.answererSessionId = that.sessionId;
            roapMessage.seq = that.incomingMessage.seq;
        }
        that.onsignalingmessage(JSON.stringify(roapMessage));
    };

    /**
     * Internal something-bad-happened function.
     * @param {string} text What happened - suitable for logging.
     */
    that.error = function (text) {
        throw 'Error in RoapOnJsep: ' + text;
    };

    that.sessionId = (Erizo.FirefoxStack.sessionId += 1);
    that.sequenceNumber = 0; // Number of last ROAP message sent. Starts at 1.
    that.actionNeeded = false;
    that.iceStarted = false;
    that.moreIceComing = true;
    that.iceCandidateCount = 0;
    that.onsignalingmessage = spec.callback;

    that.peerConnection.onopen = function () {
        if (that.onopen) {
            that.onopen();
        }
    };

    that.peerConnection.onaddstream = function (stream) {
        if (that.onaddstream) {
            that.onaddstream(stream);
        }
    };

    that.peerConnection.onremovestream = function (stream) {
        if (that.onremovestream) {
            that.onremovestream(stream);
        }
    };

    // Variables that are part of the public interface of PeerConnection
    // in the 28 January 2012 version of the webrtc specification.
    that.onaddstream = null;
    that.onremovestream = null;
    that.state = 'new1';
    // Auto-fire next events.
    that.markActionNeeded();
    return that;
};