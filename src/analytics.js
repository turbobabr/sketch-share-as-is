
import { UUIDKey } from './constants';

export const logEvent = (event, props) => {
  let uuid = NSUserDefaults.standardUserDefaults().objectForKey(UUIDKey);
  if (!uuid) {
    uuid = NSUUID.UUID().UUIDString();
    NSUserDefaults.standardUserDefaults().setObject_forKey(uuid, UUIDKey);
  }

  const fProps = {
    token : "9ce1b980de746d30a6fb36830b4f4eee",
    sketchVersion : NSBundle.mainBundle().objectForInfoDictionaryKey("CFBundleShortVersionString"),
    uuid : uuid,
    pluginVersion : coscript.printController().pluginBundle().version()
  };

  if (props) {
    for (let key in props)
      fProps[key] = props[key];
  }

  const payload = {
      event : event,
      properties : fProps
    },
    json = NSJSONSerialization.dataWithJSONObject_options_error(payload, 0, nil),
    base64 = json.base64EncodedStringWithOptions(0),
    url = NSURL.URLWithString(NSString.stringWithFormat("https://api.mixpanel.com/track/?data=%@&ip=1", base64));

  if(url) {
    NSURLSession.sharedSession().dataTaskWithURL(url).resume();
  }
};

