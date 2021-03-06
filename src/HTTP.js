const Lang = imports.lang;
const Soup = imports.gi.Soup;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const Config = imports.misc.config;

function HTTPError(statusCode, reasonPhrase) {
    this.name = "HTTPError";
    this.statusCode = statusCode;
    this.reasonPhrase = reasonPhrase;
    this.stack = (new Error()).stack;

    this.toString = () =>
        "HTTP Status: " + this.statusCode +
            ", Reason: " + this.reasonPhrase;
}

HTTPError.prototype = Object.create(Error.prototype);
HTTPError.prototype.constructor = HTTPError;

const STATUS_TOO_MANY_REQUESTS = 429;

const isErrTooManyRequests = (err) =>
    err && err.statusCode &&
        Number(err.statusCode) === STATUS_TOO_MANY_REQUESTS

const getExtensionVersion = () => {
  if (Local.metadata['git-version']) {
    return 'git-' + Local.metadata['git-version'];
  } else if (Local.metadata.version) {
    return 'v' + Local.metadata.version;
  } else {
    return 'unknown';
  }
};

const getGnomeVersion = () => {
  return Config.PACKAGE_VERSION;
};

const _repository = "http://github.com/OttoAllmendinger/" +
                    "gnome-shell-bitcoin-markets";

const _userAgent =  "gnome-shell-bitcoin-markets" +
                    "/" + getExtensionVersion() +
                    "/Gnome" + getGnomeVersion() +
                    " (" + _repository + ")";


// Some API providers have had issues with high traffic coming from single IPs
// this code helps determine if these are actually different clients from behind
// a NAT or if some clients really do many requests
const getClientId = () => {
  // GUID code from http://stackoverflow.com/a/2117523/92493
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
};

const _clientId = getClientId();

const _httpSession = new Soup.SessionAsync();


_httpSession['user-agent'] = _userAgent;

Soup.Session.prototype.add_feature.call(
  _httpSession,
  new Soup.ProxyResolverDefault()
);


const getJSON = (url, callback) => {
  // log((new Date()) + ' getJSON ' + url);
  let message = Soup.Message.new("GET", url);
  let headers = message.request_headers;
  headers.append('X-Client-Id', _clientId);
  _httpSession.queue_message(
    message,
    (session, message) => {
      if (message.status_code == 200) {
        callback(null, JSON.parse(message.response_body.data));
      } else {
        log('getJSON error url: ' + url);
        log('getJSON error status code: ' + message.status_code);
        log('getJSON error response: ' + message.response_body.data);
        callback(
            new HTTPError(
              message.status_code,
              message.reason_phrase
            ),
            null
        );
      }
    }
  );
};
