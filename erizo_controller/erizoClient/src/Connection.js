/*global window, console, navigator*/

var Erizo = Erizo || {};

Erizo.sessionId = 103;

Erizo.Connection = function (spec) {
    "use strict";
    var that = {};

    spec.session_id = (Erizo.sessionId += 1);

    // Check which WebRTC Stack is installed.
    that.browser = "";
    if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./) !== null) {
        if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] === "23") {
            // Google Chrome Stable.
            console.log("Stable!");
            that = Erizo.ChromeStableStack(spec);
            that.browser = "chrome-stable";
        } else if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] === "25") {
            // Google Chrome Canary.
            console.log("Canary!");
            that = Erizo.ChromeCanaryStack(spec);
            that.browser = "chrome-canary";
        } 
    } else if (window.navigator.appVersion.match(/Bowser\/([\w\W]*?)\./) !== null) {
        if (window.navigator.appVersion.match(/Bowser\/([\w\W]*?)\./)[1] === "25") {
            // Bowser
            that.browser = "bowser";
        }
    } else if (window.navigator.appCodeName === "Mozilla") {
        // Firefox
        that = Erizo.FirefoxStack(spec);
        that.browser = "mozilla";
    } else {
        // None.
        that.browser = "none";
        throw "WebRTC stack not available";
    }

    return that;
};

Erizo.GetUserMedia = function (config, callback, error) {
    "use strict";
    var that = {};
    console.log("Searching for browser...");
    if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./) !== null) {
        if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] === "23") {
            // Google Chrome Stable.
            console.log("Stable!");
            navigator.webkitGetUserMedia(config, callback);
            that.browser = "chrome-stable";
        } else if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] === "25") {
            // Google Chrome Canary.
            console.log("Canary!");
            navigator.webkitGetUserMedia(config, callback);
            that.browser = "chrome-canary";
        }
    } else if (window.navigator.appVersion.match(/Bowser\/([\w\W]*?)\./) !== null) {
        if (window.navigator.appVersion.match(/Bowser\/([\w\W]*?)\./)[1] === "25") {
            // Bowser
            console.log("Bowser");
            navigator.webkitGetUserMedia("audio, video", callback);
            that.browser = "bowser";
        }
    } else if (window.navigator.appCodeName === "Mozilla") {
        // Firefox
        console.log("Firefox");
        navigator.mozGetUserMedia({video: true}, callback, function(){});
        that.browser = "mozilla";
    } else {
        // None.
        console.log("None!");
        that.browser = "none";
        throw "WebRTC stack not available";
    }
};

Erizo.URL = function() {
    var that = {};
    if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./) !== null) {
        if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] === "23") {
            // Google Chrome Stable.
            console.log("Stable!");
            that.browser = "chrome-stable";
            return webkitURL;
        } else if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] === "25") {
            // Google Chrome Canary.
            console.log("Canary!");
            navigator.webkitGetUserMedia(config, callback);
            that.browser = "chrome-canary";
            return webkitURL;
        }
    } else if (window.navigator.appVersion.match(/Bowser\/([\w\W]*?)\./) !== null) {
        if (window.navigator.appVersion.match(/Bowser\/([\w\W]*?)\./)[1] === "25") {
            // Bowser
            console.log("Bowser");
            navigator.webkitGetUserMedia("audio, video", callback);
            that.browser = "bowser";
            return webkitURL;
        }
    } else if (window.navigator.appCodeName === "Mozilla") {
        // Firefox
        console.log("Firefox");
        that.browser = "mozilla";
        return URL;
    } else {
        // None.
        console.log("None!");
        that.browser = "none";
        throw "WebRTC stack not available";
    }
};