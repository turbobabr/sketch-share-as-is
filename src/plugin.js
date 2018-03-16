
import Utils from './utils';
import { Commands } from './constants';
import { playSystemSound, SystemSounds } from './sound';

import rasterize from './rasterize';
import { logEvent } from './analytics';

export default function (context) {
  switch(Utils.normalize(context.command.identifier())) {
    case Commands.CopyToClipboard:
      let image = rasterize(context.document,context.selection);
      if(image) {
        const pasteboard = NSPasteboard.generalPasteboard();
        pasteboard.clearContents();
        pasteboard.writeObjects(NSArray.arrayWithObject(image));

        playSystemSound(SystemSounds.Pop);
        context.document.showMessage('[share-as-is]: Resulting image has been copied to the clipboard.');

        logEvent('copyToClipboard',{
          isEntirePage: context.selection.count() < 1,
          copiedArtboards: context.selection.valueForKeyPath('@distinctUnionOfObjects.parentArtboard').count(),
          totalArtboards: context.document.currentPage().artboards().count()
        });
      }

      break;
  }
}
