
import _ from 'lodash';
import colorToMSColor from 'sketch-color';
import tinycolor from 'tinycolor2';
import { TextBehaviour, ExportOptionsFormat } from 'sketch-constants';
import Utils from './utils';

const colorToNSColor = (color) => {
  const rgba = tinycolor(color).toRgb();
  return NSColor.colorWithRed_green_blue_alpha(rgba.r / 255.0, rgba.g / 255.0, rgba.b / 255.0, rgba.a);
};

const addArtboardBlock = (page,artboard,useCustomLabelsForSymbols = true) => {
  let shape = MSShapeGroup.shapeWithRect(artboard.rect());
  shape.style().addStylePartOfType(0).color = colorToMSColor('white');

  let shadow = shape.style().addStylePartOfType(2);
  shadow.offsetX = 0;
  shadow.offsetY = 1;
  shadow.color = colorToMSColor('rgba(0,0,0,0.3)');
  shadow.blurRadius = 3;

  page.insertLayer_atIndex(shape,1);

  // Add label
  let label = MSTextLayer.alloc().init();
  label.stringValue = artboard.name();
  label.textBehaviour = TextBehaviour.Fixed;

  let textStyle = label.style().textStyle();

  const lineHeight = 24;

  let paragraphStyle = NSMutableParagraphStyle.alloc().init();
  paragraphStyle.minimumLineHeight = lineHeight;
  paragraphStyle.maximumLineHeight = lineHeight;
  paragraphStyle.lineBreakMode = NSLineBreakByTruncatingMiddle;

  const labelColor = artboard.isKindOfClass(MSSymbolMaster) && useCustomLabelsForSymbols ? '#7B20A5' : '#5F5F5F';
  let attributes = {
    'NSFont': NSFont.systemFontOfSize_weight(11,NSFontWeightLight),
    'NSColor': colorToNSColor(labelColor),
    'NSKern': 0.1,
    'NSParagraphStyle': paragraphStyle
  };

  textStyle.attributes = attributes;

  const rect = artboard.rect();

  label.rect = CGRectMake(rect.origin.x+3,rect.origin.y-lineHeight+1,rect.size.width-3,lineHeight);
  page.insertLayer_atIndex(label,page.layers().count());

  return [shape,label];
};

const rasterize = (document,selection,options = {}) => {
  let documentData = document.documentData().copyWithOptions(1);
  let page = documentData.currentPage();
  if(page.layers().count() < 1) {
    return null;
  }

  let artboards = NSArray.arrayWithArray([]);
  let rect = null;

  let exportSelectedLayersOnly = false;

  if(selection.count() < 1) {
    const layers = page.layers();
    for(let i=0;i<layers.count();i++) {
      let layer = layers.objectAtIndex(i);
      rect = !rect ? layer.absoluteInfluenceRect() : CGRectUnion(layer.absoluteInfluenceRect(),rect);
    }

    artboards = page.artboards();
  } else {
    const originalArtboards = selection.valueForKeyPath('@distinctUnionOfObjects.parentArtboard');
    const shadowArtboards = [];
    _.each(Utils.normalize(originalArtboards),(artboard) => {
      const shadowArtboard = documentData.layerWithID(artboard.objectID());
      if(shadowArtboard) {
        shadowArtboards.push(shadowArtboard);
      }
    });

    artboards = NSArray.arrayWithArray(shadowArtboards);
    _.each(Utils.normalize(artboards),(artboard) => {
      artboard.includeBackgroundColorInExport = true;
    });

    let layers = artboards;
    for(let i=0;i<layers.count();i++) {
      let layer = layers.objectAtIndex(i);
      rect = !rect ? layer.absoluteInfluenceRect() : CGRectUnion(layer.absoluteInfluenceRect(),rect);
    }

    exportSelectedLayersOnly = true;
  }

  rect = CGRectInset(rect,-80,-80);

  // Add Background.
  let shape = MSShapeGroup.shapeWithRect(rect);
  shape.style().addStylePartOfType(0).color = colorToMSColor('#F2F2F2');

  page.insertLayer_atIndex(shape,0);

  // Add artboard mocks
  let boards = _.map(artboards,board => board);
  let addedLayers = [];
  _.each(boards,(board) => {
    if(board.isKindOfClass(MSArtboardGroup)) {
      addedLayers = addedLayers.concat(addArtboardBlock(page,board));
    }
  });

  const request = MSExportRequest.alloc().init();
  request.rect = rect;
  request.scale = 1;
  request.shouldTrim = false;
  request.format = ExportOptionsFormat.PNG;
  request.immutableDocument = documentData.immutableModelObject();
  request.rootLayer = page.immutableModelObject();
  request.includeArtboardBackground = true;

  if(exportSelectedLayersOnly) {
    let includedLayerIDs = NSMutableSet.alloc().init();
    _.each(boards.concat(addedLayers).concat([shape]),(board) => {
      const objectIDs = request.objectIDsForSelfAncestorsAndChildrenOfAncestry(MSImmutableLayerAncestry.ancestryWithMSLayer(board));
      includedLayerIDs.unionSet(objectIDs);
    });

    request.includedLayerIDs = NSSet.setWithSet(includedLayerIDs);
    request.options = 1;
  }

  const exporter = MSExporter.exporterForRequest_colorSpace(request, NSColorSpace.sRGBColorSpace());
  return exporter.image();
};

export default rasterize;
