// *****************************************************************
// =================================================================
// ----------------------- SMRT-Flames Tool --------------------- ||
// =================================================================
// *****************************************************************

// =================================================================
// *****************   --    User Interface    --   ****************
// =================================================================
// ----------------
// Import Modules |
// ----------------
var params = require('users/smokepolicytool/smrt-flames:Modules/SMRT-Flames_params.js');
var dict = require('users/smokepolicytool/smrt-flames:Modules/SMRT-Flames_dict.js');
var baseMap = require('users/embrslab/packages:baseMap.js');
var colPals = require('users/embrslab/packages:colorPalette.js');

// -----------------------------------
// - - - - - - UI PANELS - - - - - - |
// -----------------------------------
// --------------
// Input Panel
// --------------
var inputPanel = function(receptor) {
  var closestMetYear = dict.getClosestMetYear(receptor);
  
  var policyToolLabel = ui.Label('SMRT-Flames', {margin: '12px 0px 0px 8px', 
    fontWeight: 'bold', fontSize: '24px', border: '1px solid black', padding: '3px 3px 3px 3px'});
  var policyToolSubtitle = ui.Label('Smoke Management and Risk Tool with Fire-Land-Atmosphere Mapped Scenarios', 
    {margin: '5px 0px 0px 8px', fontSize: '14px'});
  
  var infoLabel = ui.Label('SMRT-Flames estimates the population-weighted smoke risk from wildfires on a regional basis across the western U.S and explores the impact of hypothetical land management scenarios on reducing smoke risk.',
    {margin: '4px 20px 2px 8px', fontSize: '12px', color: '#777'});
  
  var paperLabel = ui.Label('[Paper]', {textAlign: 'left', margin: '3px 5px 3px 8px', fontSize: '12.5px', color: '#5886E8'},'https://doi.org/10.1021/acs.est.5c01914');
  var codeLabel = ui.Label('[Code]', {textAlign: 'left', margin: '3px 5px 3px 3px', fontSize: '12.5px', color: '#5886E8'},'https://github.com/tianjialiu/SMRT-Flames');
  var linksPanel = ui.Panel(
    [paperLabel,codeLabel],
    ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}
  );

  var headDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '10px 0px 5px 0px', height:'1px', border:'0.75px solid black',stretch:'horizontal'});
 
  var policyDetailsPanel = ui.Panel([
    ui.Panel([policyToolSubtitle,linksPanel,infoLabel],
      ui.Panel.Layout.Flow('vertical')),
      headDivider],
    ui.Panel.Layout.Flow('vertical'), {stretch: 'horizontal'});
       
  var inputSectionLabel = ui.Label('Input Parameters', {margin: '8px 8px 5px 8px', fontWeight: 'bold', fontSize: '20px'});
  
  // treatment zone and receptor
  var zoneLabel = ui.Label('1) Select Zone:', {padding: '5px 26px 0px 0px', fontSize: '14.5px'});
  var receptorLabel = ui.Label('2) Select Receptor:', {padding: '5px 0px 0px 0px', fontSize: '14.5px'});
  
  var zoneSelect = ui.Select({items: params.zoneVec, 
    value: 'Northern California', style: {stretch: 'horizontal'}});
  var receptorSelect = ui.Select({items: params.receptorVec, 
    value: 'Northern California', style: {stretch: 'horizontal'}});
  
  var zoneMessage = ui.Label('treatment zone for land management',
    {margin: '0px 12px 6px 145px', color: '#999', fontSize: '12px'});
  var receptorMessage = ui.Label('receptor for population-weighted smoke exposure',
    {margin: '0px 12px 6px 145px', color: '#999', fontSize: '12px'});
  
  var zonePanel = ui.Panel([zoneLabel, zoneSelect], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
  var receptorPanel = ui.Panel([receptorLabel, receptorSelect], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
    
  // input / fire emissions year
  var inputYearLabel = ui.Label('3) Fire Emissions Year:', {fontSize: '14.5px'});
  var inputYearSlider = ui.Slider({min: params.sYear, max: params.eYear, value: 2020, step: 1});
  inputYearSlider.style().set('stretch', 'horizontal');
  
  var inputYearPanel = ui.Panel([inputYearLabel, inputYearSlider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
    
  // meteorology year
  var metYearLabel = ui.Label('4) Meteorology Year:', {fontSize: '14.5px'});
  var metYearSlider = ui.Slider({min: params.sYear_adj, max: params.eYear_adj, value: 2020, step: 1});
  metYearSlider.style().set('stretch', 'horizontal');
  
  inputYearSlider.onChange(function(slideYear) {
    return metYearSlider.setValue(closestMetYear[slideYear]);
  });
  
  var metYearMessage = ui.Label('The meteorology year moves to the most closely-matched meteorology year (from 2016-2021) based on the average fire season (Jul-Nov) vapor pressure deficit.',
    {margin: '0px 12px 6px 24px', color: '#999', fontSize: '12px'});
  
  var metYearPanel = ui.Panel([metYearLabel, metYearSlider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
    
  zoneSelect.onChange(function(zoneName) {
    var zone = params.getZoneCode(zoneName);
    var closestMetYear = params.getClosestMetYear(zone);
    
    inputYearSlider.setValue(2020);
    metYearSlider.setValue(2020);
    
    inputYearSlider.onChange(function(slideYear) {
      return metYearSlider.setValue(closestMetYear[slideYear]);
    });
  });
  
  // smoke risk parameters
  var riskPanelLabel = ui.Label('Smoke Risk Parameters', 
    {margin: '8px 8px 0px 8px', fontWeight: 'bold', fontSize: '16px'});
  var burnedLabel = ui.Label('5) Average % Area Burned:', {fontSize: '14.5px'});
  
  var burnedSAVALabel = ui.Label('Savanna:', {fontSize: '14.5px'});
  var burnedSAVABox = ui.Textbox({placeholder: '[0-1]',
    value: dict.baFracList[receptor].SAVA,
    style: {margin: '4px 8px 8px 8px'}
  });
  
  var burnedSAVAPanel = ui.Panel([burnedSAVALabel, burnedSAVABox], 
    ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal', margin: '0px 0px 0px 16px'});
    
  var burnedTEMFLabel = ui.Label('Temperate Forest:', {fontSize: '14.5px'});
  var burnedTEMFBox = ui.Textbox({placeholder: '[0-1]', 
    value: dict.baFracList[receptor].TEMF, 
    style: {margin: '4px 8px 8px 8px'}
  });
  
  var burnedTEMFPanel = ui.Panel([burnedTEMFLabel, burnedTEMFBox], 
    ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal', margin: '0px 0px 0px 16px'});
   
  var fcLabel = ui.Label('6) Fuel Consumption Level:', {fontSize: '14.5px'});
  var fcList = ['Mean', 'Low', 'Median', 'High'];
  var fcSelect = ui.Select({items: fcList, value: 'Mean', 
    style: {stretch: 'horizontal', margin: '3px 8px 0px 0px'}});
  
  var fcPanel = ui.Panel([fcLabel, fcSelect], 
      ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
    
  // land management scenarios
  var lmLabel = ui.Label('7) Custom Land Management Scenario:',
    {fontSize: '14.5px', margin: '8px 8px 4px 8px'});
  var lmSelect = ui.Select({items: ['Targeted','Variable'],
    value: 'Targeted', 
    style: {stretch: 'horizontal', margin: '3px 8px 3px 24px'}});
  var lmText = ui.Textbox({
    placeholder: '',
    value: '[15,0.5]',
    style: {margin: '0px 8px 8px 24px', stretch: 'horizontal'}
  });
  
  var lmLabelInstructions_custom = 'Enter a list in the format of [[lon,lat,LMI],..], where LMI = land management intensity (0 = no land management, 1 = complete land management efficacy / fire prevention).';
  var lmLabelInstructions_gc = 'Enter an array in the format of [n grid cells,LMI], indicating how the top x number of grid cells in smoke exposure contribution to target at a specified land management intensity (LMI), ranging from 0-1.';
  
  var lmLabelInstructions = ui.Label(lmLabelInstructions_gc,
    {fontSize: '12px', color:'#999', margin: '2px 10px 8px 24px'});
  
  lmSelect.onChange(function(lmSelected) {
    if (lmSelected == 'Targeted') {
      lmLabelInstructions.setValue(lmLabelInstructions_gc);
      lmText.setValue('[15,0.5]');
    }
    if (lmSelected == 'Variable') {
      lmLabelInstructions.setValue(lmLabelInstructions_custom);
      lmText.setValue('[]');
    }
  });
  
  var lmPanel = ui.Panel([lmLabel, lmSelect, lmLabelInstructions, lmText], 
    ui.Panel.Layout.Flow('vertical'), {stretch: 'horizontal'});
    
  return ui.Panel([
    policyToolLabel,
    policyDetailsPanel,
    inputSectionLabel,
    zonePanel,
    zoneMessage,
    receptorPanel,
    receptorMessage,
    inputYearPanel,
    metYearPanel,
    metYearMessage,
    riskPanelLabel,
    burnedLabel,
    burnedSAVAPanel,
    burnedTEMFPanel,
    fcPanel,
    lmPanel
  ]);
};

var getZone = function(inputPanel) {
  return inputPanel.widgets().get(3).widgets().get(1).getValue();
};

var getReceptor = function(inputPanel) {
  return inputPanel.widgets().get(5).widgets().get(1).getValue();
};

var getYears = function(inputPanel) {
  return {
    inputYear: inputPanel.widgets().get(7).widgets().get(1).getValue(),
    metYear: Number(inputPanel.widgets().get(8).widgets().get(1).getValue()),
  };
};

var getRiskInput = function(inputPanel) {
  return {
    savaBurned: Number(inputPanel.widgets().get(12).widgets().get(1).getValue()),
    temfBurned: Number(inputPanel.widgets().get(13).widgets().get(1).getValue()),
    fuelConsumption: inputPanel.widgets().get(14).widgets().get(1).getValue()
  };
};

var getLMScenario = function(inputPanel) {
  return {
    lmType: inputPanel.widgets().get(15).widgets().get(1).getValue(),
    lmInput: inputPanel.widgets().get(15).widgets().get(3).getValue()
  };
};

// -----------------
// Submit Button
// -----------------
var submitButton = function() {
  return ui.Button({label: 'Submit', style: {stretch: 'horizontal'}});
};

// --------
// Legends
// --------
var getLayerCheck = function(map, label, value, layerPos, opacity, layerMode) {
  var checkLayer = ui.Checkbox({label: label, value: value,  
    style: {fontWeight: 'bold', fontSize: '16px', margin: '2px 0 5px 8px'}});
  
  if (layerMode == 'nested') {
    checkLayer = ui.Checkbox({label: label, value: value,  
      style: {fontSize: '15px', margin: '3px 0 5px 8px'}});
  }
  
  checkLayer.onChange(function(checked) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setShown(checked);
  });
  
  var opacityLayer = ui.Slider({min: 0, max: 1, value: opacity, step: 0.01,
    style: {margin: '3px 3px 0px 10px'}
  });
  
  opacityLayer.onChange(function(value) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setOpacity(value);
  });

  return ui.Panel([checkLayer, opacityLayer], ui.Panel.Layout.flow('horizontal'));
};

var getLayerCheck = function(map, label, value, layerPos, opacity, layerMode) {
  var checkLayer = ui.Checkbox({label: label, value: value,  
    style: {fontWeight: 'bold', fontSize: '16px', margin: '2px 0 5px 8px'}});
  
  if (layerMode == 'nested') {
    checkLayer = ui.Checkbox({label: label, value: value,  
      style: {fontSize: '15px', margin: '0px 0 6px 8px'}});
  }
  
  checkLayer.onChange(function(checked) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setShown(checked);
  });
  
  var opacityLayer = ui.Slider({min: 0, max: 1, value: opacity, step: 0.01,
    style: {margin: '3px 3px 0px 10px'}
  });
  
  opacityLayer.onChange(function(value) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setOpacity(value);
  });

  return ui.Panel([checkLayer, opacityLayer], ui.Panel.Layout.flow('horizontal'));
};

var discreteLegend = function(map, title, labels, colPal, showValue,
  layerPos, opacity, layerMode) {
  var discreteLegendPanel = ui.Panel({
    style: {
      padding: '0px 0px 5px 0px'
    }
  });
   
  var legendTitle = getLayerCheck(map, title, showValue, layerPos, opacity, layerMode);
  discreteLegendPanel.add(legendTitle);
  
  var makeRow = function(colPal, labels) {
    var colorBox = ui.Label({
      style: {
        backgroundColor: colPal,
        padding: '8px',
        margin: '0 0 4px 10px'
      }
    });

    var description = ui.Label({value: labels, style: {margin: '0 0 5px 6px'}});
    return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
  }; 
  
  for (var i = 0; i < labels.length; i++) {
    discreteLegendPanel.add(makeRow(colPal[i], labels[i]));
  }
  
  return discreteLegendPanel;
};

var discreteLegendBorder = function(map, title, labels, colPal, showValue,
  layerPos, opacity, layerMode) {
  var discreteLegendPanel = ui.Panel({
    style: {
      padding: '0px 0px 5px 0px'
    }
  });
   
  var legendTitle = getLayerCheck(map, title, showValue, layerPos, opacity, layerMode);
  discreteLegendPanel.add(legendTitle);
  
  var makeRow = function(colPal, labels) {
    var colorBox = ui.Label({
      style: {
        border: 'solid 2px ' + colPal,
        padding: '5px',
        margin: '1px 0 4px 10px'
      }
    });

    var description = ui.Label({value: labels, style: {margin: '0 0 5px 6px'}});
    return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
  }; 
  
  for (var i = 0; i < labels.length; i++) {
    discreteLegendPanel.add(makeRow(colPal[i], labels[i]));
  }
  
  return discreteLegendPanel;
};

var continuousLegend = function(map, title, colPal, minVal,
  maxVal, units, stretchFactor, maxValPos, showValue, layerPos, opacity, layerMode) {
  var continuousLegendPanel = ui.Panel({
    style: {
      padding: '0px 0px 5px 0px'
    }
  });
  
  var legendTitle = getLayerCheck(map, title, showValue, layerPos, opacity, layerMode);
  continuousLegendPanel.add(legendTitle);
  continuousLegendPanel.add(ui.Label(units,{margin: '-2px 0 6px 8px'}));

  var makeRow = function(colPal) {
    var colorBox = ui.Label('', {
        backgroundColor: colPal,
        padding: '8px' + ' ' + stretchFactor + 'px',
        margin: '0 0 4px 0px',
    });
    return ui.Panel({widgets: [colorBox], layout: ui.Panel.Layout.Flow('vertical')});
  };
  
  var colPalWidget = []; var labelWidget = [];
  for (var i = 0; i < colPal.length; i++) {
    colPalWidget[i] = makeRow(colPal[i]);
  }
  
  continuousLegendPanel.add(ui.Panel({widgets: colPalWidget, layout: ui.Panel.Layout.Flow('horizontal'),
    style: {margin: '0 0 6px 8px'}}));
  continuousLegendPanel.add(ui.Label(minVal,{margin: '-6px 0px 0px 8px'}));
  continuousLegendPanel.add(ui.Label(maxVal,{margin: '-17px 5px 0px ' + maxValPos + 'px', textAlign: 'right'}));
  
  return continuousLegendPanel;
};

var legendPanel = function(legendPanelParent) {
  
  legendPanelParent.add(
    ui.Panel({
      widgets: [
        ui.Label('Map Layers', {fontWeight: 'bold', fontSize: '20px', margin: '0px 0px 0px 8px'}),
        ui.Label('Note: Use the sliders associated with each legend to change the opacity of map layers.', {fontSize: '12px', margin: '4px 0px 0px 8px', color: '#999'}),
        
        // Smoke risk layers
        ui.Label('Smoke Risk Index Layers', {margin: '10px 0px 6px 8px',
          fontSize: '18.5px', fontWeight: '100'}),
        ui.Label('Smoke Risk Index', {fontWeight: 'bold', fontSize: '17px', margin: '2px 0 5px 8px'}),
        getLayerCheck(map, 'Base Scenario', true, 11, 0.8, 'nested'),
        discreteLegend(map, 'Custom Scenario', 
          params.smokeRiskIndexLabels,
          params.smokeRiskColRampRev, false, 10, 0.8, 'nested'),
        ui.Label('Priority Smoke Risk Targets', {fontWeight: 'bold', fontSize: '17px', margin: '2px 0 3px 8px'}),
        getLayerCheck(map, 'Base Scenario', true, 13, 1, 'nested'),
        discreteLegendBorder(map, 'Custom Scenario', 
          ['Top 15 grid cells'],['#00BFFF'], false, 12, 1, 'nested'),
        ui.Label('', {fontSize: '14px', margin: '2px 0 4px 8px'}),
        continuousLegend(map, 'Custom Land Management',
          params.scenarioColRampRev, 0, 1,
          'land management intensity', 20.625, 332, false, 9, 1, 'main'),
        ui.Label('Recurrence Factor', {fontWeight: 'bold', fontSize: '17px', margin: '2px 0 2px 8px'}),
        ui.Label('last fire relative to recurrence interval', 
          {fontSize: '14px', margin: '0px 0 0px 8px'}),
        ui.Label('(0 = recent fire, 1 = fire is due)', 
          {fontSize: '14px', margin: '0px 0 5px 8px', color:'#777'}),
        getLayerCheck(map, 'Savanna', false, 7, 0.8, 'nested'),
        continuousLegend(map, 'Temperate Forest',
          params.RFColRamp, 0, 1,
          [], 20.625, 332, false, 8, 0.8, 'nested'),
        ui.Label('Land Cover Fraction', {fontWeight: 'bold', fontSize: '17px', margin: '2px 0 2px 8px'}),
        getLayerCheck(map, 'Savanna', false, 5, 0.8, 'nested'),
        continuousLegend(map, 'Temperate Forest',
          params.LCfracColRamp, 0, 1,
          [], 20.625, 332, false, 6, 0.8, 'nested'),
        continuousLegend(map, 'GEOS-Chem Adjoint Sensitivity',
          params.sensColRamp, 0, '> 10⁵',
          'Jul-Nov Average, (μg m⁻³) / (g m⁻² s⁻¹)', 20.625, 307, false, 14, 0.4, 'main'),
        discreteLegendBorder(map, 'GEOS-Chem Adjoint Boundaries', 
          ['Adjoint Domain','Receptor'],
          ['#DCDCDC','black'], false, 15, 1, 'main'),
     
        // Historical fire layers
        ui.Label('Historical Fire Layers', {margin: '8px 0px 8px 8px',
          fontSize: '18.5px', fontWeight: '100'}),
        continuousLegend(map, 'OC + BC Fire Emissions',
          params.emissColRamp, 0, '> 5',
          'GFEDv4s, Jul-Nov Total, Gg', 20.625, 318, false, 4, 1, 'main'),
        continuousLegend(map, 'PM2.5 Exposure Contribution',
          params.PMColRamp, 0, '> 20',
          'Jul-Nov Average, μg m⁻³, scaled by 100', 20.625, 310, false, 3, 1, 'main'),
          
        // Ancillary layers
        ui.Label('Ancillary Layers', {margin: '8px 0px 8px 8px',
          fontSize: '18.5px', fontWeight: '100'}),
        continuousLegend(map, 'Vapor Pressure Deficit',
          params.metColRamp, 0, '> 2500',
          'ERA5-Land, Jul-Nov Avg, Pa', 20.625, 295, false, 2, 0.75, 'main'),
        continuousLegend(map, 'Population Density',
          params.popColRamp, 0, '> 200',
          'GPWv4, people per sq. km', 20.625, 303, false, 1, 0.75, 'main'),
        discreteLegend(map, 'NLCD Land Cover', 
          params.lcLabels, params.lcColRamp, false, 0, 0.75, 'main')
        ],
      style: {margin: '12px 8px 8px 4px'}
    }));
};

// Control panel
var controlPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '350px', maxWidth: '350px'}
});

// Legend panel
var legendPanelParent = ui.Panel([], null,
  {width: '360px', maxWidth: '360px'});

// Plot panel
var plotPanel = ui.Panel([]);

// Map panel
var map = ui.Map();
map.style().set({cursor:'crosshair'});
map.setCenter(-113,38,5);
map.setControlVisibility({fullscreenControl: false, layerList: false});
map.setOptions('ROADMAP', {'Silver': baseMap.silverTheme});

// default app params
var receptor = 'NorCal';

var submitButton = submitButton();
var inputPanel = inputPanel(receptor);

var clickCounter = 0;

// Display Panels
controlPanel.add(inputPanel);
controlPanel.add(submitButton);
controlPanel.add(plotPanel);

ui.root.clear();
  
var init_panels = ui.SplitPanel({firstPanel: controlPanel,
  secondPanel: map});
  
var ui_panels = ui.SplitPanel({
  firstPanel: ui.Panel([init_panels]),
  secondPanel: legendPanelParent
});

ui.root.add(init_panels);

// Run calculations, linked to submit button
submitButton.onClick(function() {
  clickCounter = clickCounter + 1;
  if (clickCounter > 1) {
    legendPanelParent.clear();
    legendPanel(legendPanelParent);
  }
  if (clickCounter == 1) {
    ui.root.remove(init_panels);
    ui.root.add(ui_panels);
    legendPanel(legendPanelParent);
  }
  
  // Scenario Parameters:
  var inputYear = getYears(inputPanel).inputYear;
  var metYear = getYears(inputPanel).metYear;
  
  var savaBurned = getRiskInput(inputPanel).savaBurned / 100;
  var temfBurned = getRiskInput(inputPanel).temfBurned / 100;
  var fuelConsumption = getRiskInput(inputPanel).fuelConsumption;
  
  var receptorName = getReceptor(inputPanel);
  var receptor = params.getReceptorCode(receptorName);
  var zoneName = getZone(inputPanel);
  var zone = params.getZoneCode(zoneName);
  
  var inEmiInvName = 'GFEDv4s';
 
  var lmScenario = getLMScenario(inputPanel);
  var lmType = lmScenario.lmType;
  var lmInput = ee.String(lmScenario.lmInput).decodeJSON();
  
  var zoneGeom = params.zoneGeomList[zone];
  var lmGrid = params.getLMGrid(zone);
  var receptorBounds = params.getReceptorBounds(receptor);

  // Display Maps:
  var sensitivityMap = params.getSensMap(metYear,receptor);
  var PMExposureMap = params.getPMmap(inEmiInvName,inputYear,metYear,receptor,zone);
  var emissMap = params.getEmissMap(inEmiInvName,inputYear);
  
  // ancillary layers
  var metMap = params.getMetMap(metYear,zone);
  var popDensityMap = params.getPopDensityMap(inputYear,zone);
  var lcMap = params.getLCMap(inputYear,zone);
  
  // smoke risk
  // base scenario
  var customLM = params.getLMscenario_variable(inEmiInvName,[],zone);
  var smokeRiskValsMap = params.getSmokeRiskValsMap(inEmiInvName,savaBurned,temfBurned,
    fuelConsumption,inputYear,metYear,receptor,zone,customLM);
  var smokeRiskVals = params.getSmokeRiskVals(smokeRiskValsMap,lmGrid,inputYear);
  var smokeRiskMap = params.getSmokeRiskIndexMap(inEmiInvName,savaBurned,temfBurned,
    fuelConsumption,inputYear,metYear,receptor,zone,customLM);
  var priorityBorders = params.getPriorityRiskImg(smokeRiskValsMap,lmGrid,inputYear);
  var priorityBordersVec = params.getPriorityRiskVec(smokeRiskValsMap,lmGrid,inputYear);
  
  if (lmType == 'Targeted') {
    customLM = params.getLMscenario_targeted(inEmiInvName,lmInput,zone,smokeRiskVals);
  }
  if (lmType == 'Variable') {
    customLM = params.getLMscenario_variable(inEmiInvName,lmInput,zone);
  }
  
  // custom LM scenario
  var smokeRiskValsMap_customLM = params.getSmokeRiskValsMap(inEmiInvName,savaBurned,temfBurned,
    fuelConsumption,inputYear,metYear,receptor,zone,customLM);
  var smokeRiskVals_customLM = params.getSmokeRiskVals(smokeRiskValsMap_customLM,lmGrid,inputYear);
  var smokeRiskMap_customLM = params.getSmokeRiskIndexMap(inEmiInvName,savaBurned,temfBurned,
    fuelConsumption,inputYear,metYear,receptor,zone,customLM);
  var priorityBorders_customLM = params.getPriorityRiskImg(smokeRiskValsMap_customLM,lmGrid,inputYear);
  var priorityBordersVec_customLM = params.getPriorityRiskVec(smokeRiskValsMap_customLM,lmGrid,inputYear);
  
  // land cover and recurrence factor
  var LCfracMap = params.getLCfracMap(inEmiInvName,inputYear,zone);
  var RFMap = params.getRFMap(inEmiInvName,inputYear,zone);
  
  map.clear(); 
  map.setCenter(-120,38,6);
  map.setControlVisibility({layerList: false});
  map.setOptions('ROADMAP', {'Silver': baseMap.silverTheme});
  
  // Ancillary layers
  map.addLayer(lcMap.clip(zoneGeom),
    {palette:params.lcColRamp, min:1, max:9},
    'NLCD Land Cover', false, 0.75);
  
  map.addLayer(popDensityMap.clip(zoneGeom), 
    {palette:params.popColRamp, max:200},
    'Population Density', false, 0.75);
  
  map.addLayer(metMap.clip(zoneGeom), 
    {palette:params.metColRamp, max:2500},
    'Vapor Pressure Deficit (Jul-Nov)', false, 0.75);
  
  // Historical fire layers
  map.addLayer(PMExposureMap.multiply(100).selfMask().clip(zoneGeom),
    {palette:params.PMColRamp, max:20},
    'PM2.5 Exposure (Jul-Nov), scaled by 100', false);
    
  map.addLayer(emissMap.selfMask(),
    {palette:params.emissColRamp, max:5},
    'OC+BC Emissions (Jul-Nov)', false);
  
  // Smoke risk layers
  map.addLayer(LCfracMap.select('A_SAVA').multiply(100).clip(zoneGeom), 
    {palette: params.LCfracColRamp, min:0, max:100},
    'SAVA (fractional area)', false, 0.8);
  
  map.addLayer(LCfracMap.select('A_TEMF').multiply(100).clip(zoneGeom),
    {palette: params.LCfracColRamp, min:0, max:100},
    'TEMF (fractional area)', false, 0.8);
    
  map.addLayer(RFMap.select('R_SAVA').multiply(100)
    .updateMask(LCfracMap.select('A_SAVA').gt(0)).clip(zoneGeom), 
    {palette: params.RFColRamp, min:0, max:100},
    'SAVA recurrence interval', false, 0.8);
    
  map.addLayer(RFMap.select('R_TEMF').multiply(100)
    .updateMask(LCfracMap.select('A_TEMF').gt(0)).clip(zoneGeom), 
    {palette: params.RFColRamp, min:0, max:100},
    'TEMF recurrence interval', false, 0.8);
    
  map.addLayer(customLM.clip(zoneGeom),
    {palette:params.scenarioColRamp, min:0, max:1},
    'Custom Land Management Intensity',false,1);
  
  map.addLayer(smokeRiskMap_customLM.clip(zoneGeom), 
    {palette: params.smokeRiskColRamp, min:1, max:7},
    'Smoke Risk Index w/ Custom LM', false, 0.8);
    
  map.addLayer(smokeRiskMap.clip(zoneGeom), 
    {palette: params.smokeRiskColRamp, min:1, max:7},
    'Smoke Risk Index', true, 0.8);
  
  map.addLayer(priorityBorders_customLM, {palette:['#00BFFF']},
    'Top 15 At-Risk Grid Cells w/ Custom LM', false);
    
  map.addLayer(priorityBorders, {palette:['#00BFFF']},
    'Top 15 At-Risk Grid Cells', true);
  
  map.addLayer(sensitivityMap.updateMask(sensitivityMap.gt(1e4)),
    {palette:params.sensColRamp, min:0, max:1e5, opacity:0.4},
    'GEOS-Chem Adjoint Sensitivity (Jul-Nov)', false);
  
  map.addLayer(receptorBounds, {palette: ['#DCDCDC','black'], max:1},
    'GEOS-Chem Adjoint Boundaries', false);

  // Display Charts:
  plotPanel.clear();
  var footDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '6px 0px 4px 0px',height:'1px',border:'0.75px solid black',stretch:'horizontal'});
  plotPanel.add(footDivider);
  
  var PMts_annual = params.getPMts_annual(inEmiInvName,inputYear,receptor,zone);
  
  var perDiffScenarioChart = params.getPerDiffScenarioChart(inEmiInvName,zone,smokeRiskVals,
    smokeRiskVals_customLM,customLM,lmGrid,receptor,inputYear,metYear);
  var zoneReceptorPMChart = params.getZoneReceptorPMChart(inEmiInvName,inputYear,metYear,receptor,zone);
  var BAperChart = params.getBAperChart(zone);
  var metDiffChart = params.getMetDiffChart(PMts_annual);
  var metDiffSmokePMChart = params.getMetDiffSmokePMChart(PMts_annual);
  var CVMetChart = params.getCVMetChart(PMts_annual);
  
  plotPanel.add(ui.Label('Scenario Comparison', 
    {margin: '8px 8px 0px 8px', fontSize: '17px', fontWeight:'bold'}));
  plotPanel.add(ui.Label('Comparison between the base and custom land management scenarios as percent difference in the average land management intensity (LMI) in the custom scenario, smoke exposure contribution, and attributable excess deaths.', 
    {margin: '4px 8px 2px 8px', fontSize: '13px', color: '#777'}));
  plotPanel.add(perDiffScenarioChart);
  
  plotPanel.add(ui.Label('Historical Fires', 
    {margin: '8px 8px 0px 8px', fontSize: '17px', fontWeight:'bold'}));
  plotPanel.add(ui.Label('Annual population-weighted smoke PM2.5 exposure (μg m⁻³) and excess deaths from historical GFED4s fire emissions, contribution from fires within the input treatment zone and from all fires within the GEOS-Chem adjoint domain.', 
    {margin: '4px 8px 2px 8px', fontSize: '13px', color: '#777'}));
  plotPanel.add(zoneReceptorPMChart);
  plotPanel.add(ui.Label('Percent of area burned per land cover type derived from MODIS burned area and land cover datasets.', 
    {margin: '4px 8px 2px 8px', fontSize: '13px', color: '#777'}));
  plotPanel.add(BAperChart);
  
  plotPanel.add(ui.Label('Influence of Meterological Variability', 
    {margin: '8px 8px 0px 8px', fontSize: '17px', fontWeight:'bold'}));
  plotPanel.add(ui.Label('Comparison of historical population-weighted smoke exposure with GFEDv4s fire emissions and VPD for the given year under a range of meteorological conditions using all available adjoint sensitivities (2016-2021).', 
    {margin: '4px 8px 0px 8px', fontSize: '13px', color: '#777'}));
  plotPanel.add(ui.Panel({
    widgets: [metDiffSmokePMChart,metDiffChart,CVMetChart],
    style: {margin: '0px 8px 0px 8px'}
  }));
  plotPanel.add(ui.Label('CV = coefficient of variation', 
    {margin: '0px 8px 10px 15px', fontSize: '12px', color: '#777'}));
  
  var loadingMain = ui.Label('Loading Map and Charts...', 
    {fontSize: '18px', color: 'black', margin: '0'});
  var loadingSubtitle = ui.Label('(scroll down on left panel for charts)', 
    {fontSize: '15px', color: '#777', margin: '3px 0 0 0'});
  
  var loadingPanel = ui.Panel({
    widgets: [loadingMain,loadingSubtitle],
    style: {border: '2px solid #DCDCDC',
      position: 'bottom-left',
      margin: '0'
    }
  });
  
  map.add(loadingPanel);
  map.onTileLoaded(function() {
    map.remove(loadingPanel);
    map.unlisten();
  });
  
});
