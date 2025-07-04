/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var LCFire = ee.ImageCollection("users/smokepolicytool/CONUS_adm/CONUS_LCFire_0p25deg"),
    TIGER = ee.FeatureCollection("TIGER/2018/States"),
    gfedGrid = ee.FeatureCollection("projects/GlobalFires/GFEDv4poly"),
    gfedAncill = ee.Image("projects/GlobalFires/GFEDv4s_ancill"),
    ERA5 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR"),
    NLCD2019 = ee.ImageCollection("USGS/NLCD_RELEASES/2019_REL/NLCD"),
    NLCD2021 = ee.ImageCollection("USGS/NLCD_RELEASES/2021_REL/NLCD"),
    GPW = ee.ImageCollection("CIESIN/GPWv411/GPW_UNWPP-Adjusted_Population_Density"),
    CONUS_GFED4sFC = ee.FeatureCollection("users/smokepolicytool/CONUS_adm/CONUS_GFED4sFC_LMzone"),
    CONUS_BAper = ee.FeatureCollection("users/smokepolicytool/CONUS_adm/CONUS_BAper_LMzone"),
    healthLookup = ee.FeatureCollection("users/smokepolicytool/CONUS_adm/CONUS_healthLookup"),
    vodonos_meta = ee.FeatureCollection("projects/GlobalFires/HealthCRF/vodonos2018_meta");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ===============================
// Calculate OC+BC Emissions and
// Monthly Smoke PM2.5
// ===============================

var outputRegion = ee.Geometry.Rectangle([-137,15,-60,60],'EPSG:4326',false);
var projFolder = 'users/smokepolicytool/';
var globalFiresFolder = 'projects/GlobalFires/';
var adjointFolder = projFolder + 'GC_adjoint_sensitivities/';
var adjointFolder_ds = projFolder + 'GC_adjoint_sensitivities_0p25deg/';
var receptorMaskCol = projFolder + 'CONUS_adm/CONUS_receptorMasks/';
var lmGridFolder = projFolder + 'CONUS_adm/CONUS_lmGrids_0p25deg/';

// Fire season
var sMonth = 7; var eMonth = 11; // Fire season (Jul-Nov)
var nMonths = (eMonth - sMonth) + 1;

exports.sMonth = sMonth;
exports.eMonth = eMonth;
exports.nMonths = nMonths;

// Fire years
var sYear = 2003; var eYear = 2021;

exports.sYear = sYear;
exports.eYear = eYear;

// Adjoint years
var sYear_adj = 2016; var eYear_adj = 2021;

exports.sYear_adj = sYear_adj;
exports.eYear_adj = eYear_adj;

// Grid scales
var crsLatLon = 'EPSG:4326';
var sens_gridRes = [0.3125,0,-130.15625,0,-0.25,60.125];
var gfed_gridRes = [0.25,0,-180,0,-0.25,90];
var adjBounds = ee.Geometry.Rectangle([-130.15625,9.625,-59.84375,60.125],'EPSG:4326',false);
exports.crsLatLon = crsLatLon;
exports.sens_gridRes = sens_gridRes;
exports.gfed_gridRes = gfed_gridRes;
exports.adjBounds = adjBounds;

// Conversion factors
var sf_adjoint = 24 * 6; // account for number of physical time steps in adjoint
var sf_timeDay = 24 * 60 * 60; // seconds per day

// Fire emissions inventories
var invNames = ['GFEDv4s','GFEDv5'];
exports.invNames = invNames;

var invDispNames = ['GFEDv4s','GFEDv5'];
exports.invDispNames = invDispNames;

var invList = {
  'GFEDv4s': 'GFEDv4s',
  'GFEDv5': 'GFEDv5'
};
exports.invList = invList;

// Emissions factors (Akagi et al., 2011)
var EF_OC_SAVA = 2.62; var EF_OC_TEMF = 9.6;
var EF_BC_SAVA = 0.37; var EF_BC_TEMF = 0.5;

var getInEmiInv = function(inEmiInvName) {
  return ee.ImageCollection(globalFiresFolder + inEmiInvName);
};

// Grid scale and area
var landAreas = gfedAncill.select('basis_regions').gt(0);

var getGridScale = function(inEmiInv) {
  return ee.Image(inEmiInv.select('OC').first()).projection();
};

var getGridArea = function(inEmiInv) {
  var gridScale = getGridScale(inEmiInv);
  return ee.Image(inEmiInv.select('OC').first()).unmask(0).gte(0)
    .multiply(ee.Image.pixelArea())
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
};

exports.getInvName = function(invName) {
  return invList[invName];
};

// Find receptor code using full name of receptor
var receptorVec = ['Northern California','Central Valley',
  'Western U.S.','Southwest U.S.','Northwest U.S.',
  'Rocky Mountains','Southern Plains','Great Plains',
  'Midwest','Tribal Lands'];
  
var receptorList = {
  'Northern California': 'NorCal',
  'Central Valley': 'CV',
  'Western U.S.': 'WEST',
  'Southwest U.S.': 'SW',
  'Northwest U.S.': 'NW',
  'Rocky Mountains': 'RM',
  'Southern Plains': 'SP',
  'Great Plains': 'GP',
  'Mid Atlantic': 'MA',
  'Midwest': 'MW',
  'Northeast': 'NE',
  'Southeast': 'SE',
  'Appalachian': 'AP',
  'Cotton Belt': 'CB',
  'Tribal Lands': 'TB',
  'Border Regions (near Mexico)': 'BP',
  'Rural Poor': 'RP'
};

var getReceptorCode = function(receptorName) {
  return receptorList[receptorName];
};

exports.receptorVec = receptorVec;
exports.receptorList = receptorList;
exports.getReceptorCode = getReceptorCode;

// Find zone code using full name of zone
var zoneVec = ['Northern California'];

var zoneList = {
  'Northern California': 'NorCal'
};

var getZoneCode = function(zoneName) {
  return zoneList[zoneName];
};

exports.zoneVec = zoneVec;
exports.zoneList = zoneList;
exports.getZoneCode = getZoneCode;

// Bounding geometry for receptors
var getStateBounds = function(stateCodes) {
  return TIGER.filter(ee.Filter.inList('STUSPS',stateCodes)).geometry();
};

var zoneGeomList = {
  'NorCal': getStateBounds(['CA'])
    .intersection(ee.Geometry.Rectangle([-130,36,-115,45],'EPSG:4326',false),10),
  'SoCal': getStateBounds(['CA'])
    .intersection(ee.Geometry.Rectangle([-130,32,-113,36],'EPSG:4326',false),10),
  'WEST': getStateBounds(['CA','WA','OR','NV','ID','UT','AZ','MT','WY','NM','CO']),
  'gcBounds': ee.Geometry.Rectangle([-130.1562,9.625,-59.84375,60.125],'EPSG:4326',false)
};
exports.zoneGeomList = zoneGeomList;

// Retrieve adjoint sensitivities for input receptor
var getSensitivity = function(receptor, inAdjointFolder) {
  return ee.ImageCollection(inAdjointFolder + receptor + '_adjointSens_monthly');
};
exports.getSensitivity = getSensitivity;

// Retrieve receptor mask for input receptor
var getReceptorMask = function(receptor) {
  return ee.Image(receptorMaskCol + receptor + '_mask');
};
exports.getReceptorMask = getReceptorMask;

// Retrieve land management grid for input zone
var getLMGrid = function(zone) {
  return ee.FeatureCollection(lmGridFolder + zone + '_lmGrid');
};
exports.getLMGrid = getLMGrid;

// Reduces and converts an image to a feature
var imageToFeature = function(inImage, inRegion, gridScale) {
  var inImageCol = inImage.reduceRegions({
    collection: inRegion,
    reducer: ee.Reducer.sum().unweighted(),
    crs: gridScale,
    scale: gridScale.nominalScale()
  }).first();
  return ee.Feature(inImageCol);
};

var imageToFeatureMean = function(inImage,inRegion,gridScale) {
  var inImageCol = inImage.reduceRegions({
    collection: inRegion,
    reducer: ee.Reducer.mean(),
    crs: gridScale,
    scale: gridScale.nominalScale()
  }).first();
  return ee.Feature(inImageCol);
};

// Fire emissions (OC+BC), in kg
var getEmissTotal = function(inEmiInvName, inYear) {
  var inEmiInv = getInEmiInv(inEmiInvName); 
  var gridScale = getGridScale(inEmiInv);
 
  var filterYr = ee.Filter.calendarRange(inYear,inYear,'year');
  var filterMon = ee.Filter.calendarRange(sMonth,eMonth,'month');
  
  // OC + BC fire emissions (kg)
  var emissTotal = inEmiInv.filter(filterYr).filter(filterMon)
    .select(['OC','BC']).sum().reduce(ee.Reducer.sum())
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});

  return emissTotal;
};

// Smoke PM2.5 exposure (μg/m3), monthly [Emissions Rate x Sensitivity]
var getEmissReceptorMon = function(inEmiInvName, inMonth, inYear, metYear, inSens) {
  var inEmiInv = getInEmiInv(inEmiInvName);
  
  var gridScale = getGridScale(inEmiInv);
  var gridArea = getGridArea(inEmiInv);
  
  var filterYr_adj = ee.Filter.calendarRange(metYear,metYear,'year');
  var filterYr = ee.Filter.calendarRange(inYear,inYear,'year');
  var filterMon = ee.Filter.calendarRange(inMonth,inMonth,'month');
   
  // Emissions (kg)
  var emissMon = ee.Image(inEmiInv.filter(filterYr).filter(filterMon).first());

  // Sensitivity, monthly
  var sensMon = ee.Image(inSens.filter(filterYr_adj).filter(filterMon).first());

  var sDate = ee.Date(sensMon.get('system:time_start'));
  var eDate = sDate.advance(1, 'month');
  var nDays = eDate.difference(sDate, 'day');   

  // OC, BC (kg)
  var oc_emiss = emissMon.select('OC');
  var bc_emiss = emissMon.select('BC');  
  
  // Split into GEOS-Chem hydrophobic and hydrophilic fractions
  var bc_phobic = bc_emiss.multiply(0.8).rename('BCPO');
  var bc_philic = bc_emiss.multiply(0.2).rename('BCPI');
  
  var oc_phobic = oc_emiss.multiply(0.5 * 2.1).rename('OCPO');
  var oc_philic = oc_emiss.multiply(0.5 * 2.1).rename('OCPI');

  // 1. Convert OC + BC emissions, kg/grid cell/month
  var emissPart = bc_phobic.addBands(bc_philic).addBands(oc_phobic).addBands(oc_philic)
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
    
  // 2. Convert downscaled accumulated monthly sensitivity (0.25deg),
  // J / (kg/ box/ timestep)
  var sensPart = sensMon.multiply(sf_adjoint)
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
  
  // 3. Multiply OC + BC emissions rate by sensitivity
  // for smoke PM2.5 concentrations (μg m-3)
  var emissReceptorMon = emissPart.multiply(sensPart).reduce(ee.Reducer.sum())
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
  
  return emissReceptorMon;
};

var era5BandNames = ['temperature_2m','dewpoint_temperature_2m',
  'total_precipitation_sum','surface_pressure','u_component_of_wind_10m',
  'v_component_of_wind_10m'];

var era5BandNamesNew = ['meanTemp_K','dewTemp_K','precip_m',
  'surfacePressure_Pa','uWind_ms','vWind_ms'];
    
var ERA5proj = ERA5.first().projection();
var ERA5scale = ERA5proj.nominalScale();

var getVPDts = function(metYear, zone) {
  var zoneGeom = zoneGeomList[zone];
  var filterYr = ee.Filter.calendarRange(metYear,metYear,'year');
  var filterMon = ee.Filter.calendarRange(sMonth,eMonth,'month');
  
  var era5Mon_ts = ee.List.sequence(sMonth,eMonth,1).map(function(inMonth) {
    var filterMon = ee.Filter.calendarRange(inMonth,inMonth,'month');
    var era5Mon = ee.Image(ERA5.filter(filterYr).filter(filterMon).first())
      .select(era5BandNames,era5BandNamesNew);
    var meanT = era5Mon.select('meanTemp_K').subtract(273.15).rename('meanTemp_C');
    var dewT = era5Mon.select('dewTemp_K').subtract(273.15).rename('dewTemp_C');
    
    var vp_a = ee.Image(6.11).multiply(ee.Image(10).pow(dewT.multiply(7.5).divide(dewT.add(237.3))));
    var vp_s = ee.Image(6.11).multiply(ee.Image(10).pow(meanT.multiply(7.5).divide(meanT.add(237.3))));
    
    var VPD = vp_s.subtract(vp_a).multiply(100).rename('VPD_Pa');
    
    var VPD_zone = VPD.reduceRegions({
      collection: zoneGeom,
      reducer: ee.Reducer.mean().setOutputs(['VPD']),
      crs: ERA5proj,
      scale: ERA5scale
    }).first().getNumber('VPD');
    
    return ee.Feature(null,{
      metYear: metYear,
      metMonth: inMonth,
      VPD: VPD_zone,
    });
  });
  
  return ee.FeatureCollection(era5Mon_ts).aggregate_mean('VPD');
};
exports.getVPDts = getVPDts;

// Smoke PM2.5 exposure (μg/m3), monthly time series
var getPMts = function(inEmiInvName, inputYear, metYear, receptor, zone) {
  var inSens = getSensitivity(receptor,adjointFolder_ds);
  var inEmiInv = getInEmiInv(inEmiInvName); 
  var gridScale = getGridScale(inEmiInv);
  var zoneGeom = zoneGeomList[zone];
  
  var emissReceptor = ee.List.sequence(sMonth,eMonth,1).map(function(inMonth) {
    var emissReceptorMon = getEmissReceptorMon(inEmiInvName,inMonth,inputYear,metYear,inSens);
    var outputRegion = zoneGeom;
    
    return imageToFeature(emissReceptorMon,outputRegion,gridScale)
      .select(['sum'],[inEmiInvName])
      .set('system:time_start',ee.Date.fromYMD(inputYear,inMonth,1).millis());
  });
  return ee.FeatureCollection(emissReceptor);
};
exports.getPMts = getPMts;

// Smoke PM2.5 exposure (μg/m3), annual avg.
var getPM_annual = function(inEmiInvName, inputYear, metYear, receptor, zone) {
  var inSens = getSensitivity(receptor,adjointFolder_ds);
  var inEmiInv = getInEmiInv(inEmiInvName); 
  var gridScale = getGridScale(inEmiInv);
  
  var PMts_monthly = getPMts(inEmiInvName,inputYear,metYear,receptor,zone);
 
  var annualPM = ee.Feature(null, {
    fireYear: inputYear,
    metYear: metYear,
    smoke_PM25: PMts_monthly
      .aggregate_mean(inEmiInvName)
      .multiply(nMonths / 12)
  });

  return annualPM;
};
exports.getPM_annual = getPM_annual;

// Smoke PM2.5 exposure (μg/m3), annual avg., all adjoint sensitivities
var getPMts_annual = function(inEmiInvName, inputYear, receptor, zone) {
  var inSens = getSensitivity(receptor,adjointFolder_ds);
  var inEmiInv = getInEmiInv(inEmiInvName); 
  var gridScale = getGridScale(inEmiInv);
  
  var PMts_annual = ee.List.sequence(sYear_adj,eYear_adj,1).map(function(metYear) {
    var PMts_monthly = getPMts(inEmiInvName,inputYear,metYear,receptor,zone);
    var VPD_mean = getVPDts(metYear,zone);
    
    var annualPM = ee.Feature(null, {
      fireYear: inputYear,
      metYear: metYear,
      smoke_PM25: PMts_monthly
        .aggregate_mean(inEmiInvName)
        .multiply(nMonths / 12),
      VPD: VPD_mean
    });
  
    return annualPM;
  });
    
  return ee.FeatureCollection(PMts_annual);
};
exports.getPMts_annual = getPMts_annual;

// Smoke PM2.5 exposure (μg/m3), annual avg., comparison to adj bounds
var getPMfrac_annual = function(inEmiInvName, inputYear, metYear, receptor, zone) {
  var inSens = getSensitivity(receptor,adjointFolder_ds);
  var inEmiInv = getInEmiInv(inEmiInvName); 
  var gridScale = getGridScale(inEmiInv);
  
  var PMts_monthly_zone = getPMts(inEmiInvName,inputYear,metYear,receptor,zone);
  var PMts_monthly_all = getPMts(inEmiInvName,inputYear,metYear,receptor,'gcBounds');
   
  var zoneAvg = PMts_monthly_zone.aggregate_mean(inEmiInvName)
    .multiply(nMonths / 12);
  var adjBoundsAvg = PMts_monthly_all.aggregate_mean(inEmiInvName)
    .multiply(nMonths / 12);
    
  var annualPM = ee.Feature(null, {
    Receptor: receptor,
    Zone: zoneAvg,
    ZonePer: zoneAvg.divide(adjBoundsAvg).multiply(100),
    Total: adjBoundsAvg,
  });
    
  return annualPM;
};

// =============
// Display Maps
// =============
// Sensitivity, Jul-Nov average (μg m-3/g m-2 s-1)
// Adjoint hydrophilic and hydrophobic sensitivities have similar spatial variability
var getSensMap = function(metYear, receptor) {
  var inSens = getSensitivity(receptor,adjointFolder);
  var filterYr = ee.Filter.calendarRange(metYear,metYear,'year');
  var filterMon = ee.Filter.calendarRange(sMonth,eMonth,'month');
  
  var sensFilter = inSens.filter(filterYr).filter(filterMon);
  
  var sensAvg = sensFilter.map(function(sensMon) {
    var gcArea = sensMon.gte(0).multiply(ee.Image.pixelArea())
      .reproject({crs: crsLatLon, crsTransform: sens_gridRes});
      
    var sDate = ee.Date(sensMon.get('system:time_start'));
    var eDate = sDate.advance(1, 'month');
    var nDays = eDate.difference(sDate, 'day');
    
    return sensMon.multiply(sf_adjoint).multiply(1e-3)
      .multiply(gcArea).multiply(nDays).multiply(sf_timeDay)
      .reproject({crs: crsLatLon, crsTransform: sens_gridRes});
  });
  
  return ee.ImageCollection(sensAvg).mean().reduce(ee.Reducer.mean());
};
exports.getSensMap = getSensMap;

exports.sensColRamp = ['#FFFFFF','#FFFFCC','#D0ECB8','#97D6B8','#5FC1BF' ,
  '#39A3C0','#2A72B2','#253494'];
  
// PM2.5 exposure contribution, Jul-Nov average (μg m-3)
var getPMmap = function(inEmiInvName, inputYear, metYear, receptor, zone) {
  var inEmiInv = getInEmiInv(inEmiInvName);
  var gridScale = getGridScale(inEmiInv);
  var inSens = getSensitivity(receptor,adjointFolder_ds);
  var zoneGeom = zoneGeomList[zone];
  
  var emissReceptor = ee.List.sequence(sMonth,eMonth,1).map(function(inMonth) {
    var emissReceptorMon = getEmissReceptorMon(inEmiInvName,inMonth,inputYear,metYear,inSens);
    return emissReceptorMon.rename('smoke_PM25')
      .set('system:time_start',ee.Date.fromYMD(inputYear,inMonth,1).millis());
  });
 
  var meanPMcontribution = ee.ImageCollection(emissReceptor).mean()
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
    
  return meanPMcontribution;
};
exports.getPMmap = getPMmap;

exports.PMColRamp = ['#FFFFFF', '#FBC127','#F67D15','#D44842',
  '#9F2963','#65146E','#280B54','#000000'];

// OC + BC Emissions, Jul-Nov total, in Gg
var getEmissMap = function(inEmiInvName, inputYear) {
  var inEmiInv = getInEmiInv(inEmiInvName);
  var gridScale = getGridScale(inEmiInv);
  
  var emissTotal = getEmissTotal(inEmiInvName,inputYear)
    .multiply(1e-6);
 
  return ee.ImageCollection(emissTotal).sum()
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
};
exports.getEmissMap = getEmissMap;

exports.emissColRamp = ['#FFFFFF','#FFFFB2','#FED976','#FEB24C','#FD8D3C',
  '#FC4E2A','#E31A1C','#B10026'];

// ERA5-land monthly mean, Jul-Nov
var getMetMap = function(metYear, zone) {
  var zoneGeom = zoneGeomList[zone];
  var bandNames = ['temperature_2m','dewpoint_temperature_2m',
  'total_precipitation_sum','surface_pressure','u_component_of_wind_10m',
  'v_component_of_wind_10m'];

  var newBandNames = ['meanTemp_K','dewTemp_K','precip_m',
  'surfacePressure_Pa','uWind_ms','vWind_ms'];

  var eraBands = ERA5.select(bandNames,newBandNames);
  var filterYr = ee.Filter.calendarRange(metYear,metYear,'year');
  
  var metMon = ee.List.sequence(sMonth,eMonth,1)
    .map(function(inMonth) {
      var filterMon = ee.Filter.calendarRange(inMonth,inMonth,'month');
      
      var vpdMon = ee.Image(eraBands.filter(filterYr).filter(filterMon).first());

      var meanT = vpdMon.select('meanTemp_K').subtract(273.15).rename('meanTemp_C');
      var dewT = vpdMon.select('dewTemp_K').subtract(273.15).rename('dewTemp_C');
      
      var vp_a = ee.Image(6.11).multiply(ee.Image(10).pow(dewT.multiply(7.5).divide(dewT.add(237.3))));
      var vp_s = ee.Image(6.11).multiply(ee.Image(10).pow(meanT.multiply(7.5).divide(meanT.add(237.3))));
      
      var VPD = vp_s.subtract(vp_a).multiply(100).rename('VPD_Pa');
      var RH = vp_a.divide(vp_s).multiply(100).rename('RH');
      
      var uWind = vpdMon.select('uWind_ms');
      var vWind = vpdMon.select('vWind_ms');
      var windSp = (uWind.pow(2).add(vWind.pow(2))).sqrt()
        .rename('windSp_ms');

      return VPD;
    });
    
  return ee.ImageCollection(metMon).mean();
};
exports.getMetMap = getMetMap;

exports.metColRamp = ['#547A99','#7694AF','#98AFC5','#BAC9DB',
  '#C7C7C9','#BFA791','#AB8A67','#946E43'];

// Population Density (GPW)
var GPWpop = GPW.map(function(image) {
  return image.set('year',ee.Date(image.get('system:time_start')).get('year'));
});

var getPopDensityMap = function(inYear, zone) {
  var zoneGeom = zoneGeomList[zone];
  
  var popYrList = GPWpop.aggregate_array('year');
  var popYrClosest = ee.FeatureCollection(popYrList.map(function(year) {
    return ee.Feature(null, {
      year: ee.Number(year),
      diff: ee.Number(year).subtract(inYear).abs()
    });
  })).sort('diff').first().getNumber('year');
  
  var popYr = GPWpop.filter(ee.Filter.calendarRange(popYrClosest,popYrClosest,'year'))
    .first();
    
  return popYr;
};

exports.getPopDensityMap = getPopDensityMap;

exports.popColRamp = ['#D6C4F1','#CBB8E8','#BEA9DD','#AA91CE',
  '#9579BD','#8061AD','#6B499C','#57318C'];

// Land Cover Layer (USGS NLCD)
var NLCD = NLCD2019.merge(NLCD2021).map(function(image) {
  return image.set('year',ee.Date(image.get('system:time_start')).get('year'));
});
  
var getLCMap = function(inputYear, zone) {
  var zoneGeom = zoneGeomList[zone];
  var landcover = NLCD
    .filter(ee.Filter.lt('year',inputYear))
    .sort('year',false).first()
    .select('landcover');
 
  var landcover_filtered = landcover.expression(
    '(lc==11) + (lc==12)*2 + (lc>=21 & lc<=24)*3 + (lc==31)*4' +
    '+ (lc>=41 & lc<=43)*5 + (lc==52)*6 + (lc==71)*7' +
    '+ (lc>=81 & lc<=82)*8 + (lc>=90 & lc<=95)*9',
      {lc: landcover});
  return landcover_filtered;
};
exports.getLCMap = getLCMap;

exports.lcColRamp = ['#466B9F','#D1DEF8','#000000','#B3AC9F','#68AB5F',
  '#CCB879','#DFDFC2','#AB6C28','#B8D9EB'];
exports.lcLabels = ['Water','Snow/Ice','Developed','Barren','Forest',
  'Shrub','Grassland','Cropland','Wetlands'];

// fractional area of savanna and temperate forest
var getLCfracMap = function(inEmiInvName, inputYear, zone) {
  var inEmiInv = getInEmiInv(inEmiInvName);
  var gridScale = getGridScale(inEmiInv);
  var gridArea = getGridArea(inEmiInv);
  var zoneGeom = zoneGeomList[zone];
  
  var LCFire_yr = LCFire.filter(ee.Filter.calendarRange(inputYear,inputYear,'year'))
    .first();

  return LCFire_yr.select(['A_SAVA','A_TEMF']).divide(gridArea)
    .updateMask(landAreas)
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
};
exports.getLCfracMap = getLCfracMap;
exports.LCfracColRamp = ['#FFFFCC','#DCF0AE','#B7E194','#8DCF82',
  '#63BC6E','#3BA859','#1C8947','#006837'];
  
// recurrence factor
var getRFMap = function(inEmiInvName, inputYear, zone) {
  var inEmiInv = getInEmiInv(inEmiInvName);
  var gridScale = getGridScale(inEmiInv);
  var gridArea = getGridArea(inEmiInv);
  var zoneGeom = zoneGeomList[zone];
  
  var LCFire_yr = LCFire.filter(ee.Filter.calendarRange(inputYear,inputYear,'year'))
    .first();
  
  return LCFire_yr.select(['R_SAVA','R_TEMF']).updateMask(landAreas)
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
};
exports.getRFMap = getRFMap;
exports.RFColRamp = ['#404040','#727272','#A7A09E','#E1C0B4',
  '#F8B8A2','#EC8968','#C55E3B','#963413'];
  
// ----------------
// LAND MANAGEMENT 
// ----------------
// land management scenario given a user input list of
// [[lon,lat,land management intensity],...]
// [] = base scenario
var getLMscenario_variable = function(inEmiInvName, inputText, zone) {
  var inEmiInv = getInEmiInv(inEmiInvName);
  var gridScale = getGridScale(inEmiInv);
  var zoneGeom = zoneGeomList[zone];
  
  var inputPts = ee.List(inputText);
  
  var inputPtsImg = ee.Algorithms.If(inputPts.size().gt(0),
    ee.FeatureCollection(inputPts.map(function(ptVal) {
      ptVal = ee.List(ptVal);
      var lon = ee.List(ptVal).getNumber(0);
      var lat = ee.List(ptVal).getNumber(1);
      var lmi = ee.List(ptVal).getNumber(2);
      return ee.Feature(ee.Geometry.Point([lon,lat]), {value: lmi});
    })).reduceToImage(['value'],'sum').unmask(0).clamp(0,1)
      .reproject({crs: gridScale, scale: gridScale.nominalScale()}),
    ee.Image(0).reproject({crs: gridScale, scale: gridScale.nominalScale()})
  );
  
  inputPtsImg = ee.Image(inputPtsImg);
  
  return ee.Image(1).subtract(inputPtsImg).updateMask(landAreas)
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
};
exports.getLMscenario_variable = getLMscenario_variable;

// land management scenario given a user input list of
// [n grid cells, LMI]
var getLMscenario_targeted = function(inEmiInvName, inputText, zone, smokeRiskVals) {
  var inEmiInv = getInEmiInv(inEmiInvName);
  var gridScale = getGridScale(inEmiInv);
  var zoneGeom = zoneGeomList[zone];
  
  var inputs = ee.List(inputText);
  var nGridCells = ee.Number(inputs.get(0));
  var LMI = ee.Number(inputs.get(1));
  
  var gridCellsLMI = getPriorityRisk(smokeRiskVals,nGridCells)
    .map(function(gridCell) {return gridCell.set('value',LMI).centroid()})
    .reduceToImage(['value'],'max').unmask(0).clamp(0,1)
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
  
  gridCellsLMI = ee.Image(gridCellsLMI);
  
  return ee.Image(1).subtract(gridCellsLMI).updateMask(landAreas)
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
};
exports.getLMscenario_targeted = getLMscenario_targeted;

// receptor mask bounds
var getReceptorBounds = function(receptor) {
  var receptorMask = getReceptorMask(receptor);
  
  var receptorBounds = receptorMask.selfMask()
    .toInt().reduceToVectors().geometry();
  
  return ee.Image().byte()
    .paint(adjBounds,0,1)
    .paint(receptorBounds,1,1);
};
exports.getReceptorBounds = getReceptorBounds;

// get priority risk grid cells using a ranking
// i.e., grid cells with the highest smoke PM2.5 contribution
var getPriorityRisk = function(smokeRiskVals,nGridCells) {
  return ee.FeatureCollection(smokeRiskVals
    .filter(ee.Filter.gt('smoke_PM25',0))
    .sort('smoke_PM25',false)
    .toList(nGridCells,0));
};
exports.getPriorityRisk = getPriorityRisk;

var getPriorityRiskImg = function(smokeRiskValsMap,lmGrid,inputYear) {
  var smokeRiskVals = getSmokeRiskVals(smokeRiskValsMap,lmGrid,inputYear);
  
  // top 15 grid cells
  var priorityRisk = getPriorityRisk(smokeRiskVals,15);
  return ee.Image().byte()
    .paint(priorityRisk, 0, 2);
};
exports.getPriorityRiskImg = getPriorityRiskImg;

var getPriorityRiskVec = function(smokeRiskValsMap,lmGrid,inputYear) {
  var smokeRiskVals = getSmokeRiskVals(smokeRiskValsMap,lmGrid,inputYear);
  
  // top 15 grid cells
  var priorityRisk = getPriorityRisk(smokeRiskVals,15);
  return priorityRisk;
};
exports.getPriorityRiskVec = getPriorityRiskVec;

// ------------
// SMOKE RISK
// ------------
var getProjEmiss = function(savaBurned,temfBurned, 
  fuelConsumption,inputYear,metYear,zone) {
  
  var lmGrid = getLMGrid(zone);
  
  var LCFire_yr = LCFire.filter(ee.Filter.calendarRange(inputYear,inputYear,'year'))
    .first().clip(lmGrid);
  
  var savaArea = LCFire_yr.select('A_SAVA');
  var temfArea = LCFire_yr.select('A_TEMF');
  var savaRC = LCFire_yr.select('R_SAVA');
  var temfRC = LCFire_yr.select('R_TEMF');

  // fuel consumption
  var SAVAfc = CONUS_GFED4sFC.filter(ee.Filter.eq('lm_zone',zone))
    .filter(ee.Filter.eq('lc_class','SAVA'))
    .first().getNumber(fuelConsumption);
  
  var TEMFfc = CONUS_GFED4sFC.filter(ee.Filter.eq('lm_zone',zone))
    .filter(ee.Filter.eq('lc_class','TEMF'))
    .first().getNumber(fuelConsumption);
  
  // DM = area x fraction burned x recurrence factor
  var savaDM = savaArea.multiply(savaBurned).multiply(savaRC)
    .multiply(ee.Image.constant(SAVAfc))
    .rename('DM_SAVA');
  var temfDM = temfArea.multiply(temfBurned).multiply(temfRC)
    .multiply(ee.Image.constant(TEMFfc))
    .rename('DM_TEMF');
    
  // Conversion to OC, BC (kg) from DM (kg)
  var oc_SAVA = savaDM.multiply(EF_OC_SAVA).rename('OC');
  var oc_TEMF = temfDM.multiply(EF_OC_TEMF).rename('OC');  
  
  var bc_SAVA = savaDM.multiply(EF_BC_SAVA).rename('BC');
  var bc_TEMF = temfDM.multiply(EF_BC_TEMF).rename('BC'); 
  
  var oc = ee.ImageCollection([oc_SAVA,oc_TEMF]).sum()
    .multiply(1e-3).rename('OC');
  var bc = ee.ImageCollection([bc_SAVA,bc_TEMF]).sum()
    .multiply(1e-3).rename('BC');
  
  return LCFire_yr.addBands([oc,bc]);
};

var getProjEmissReceptor = function(inEmiInvName,savaBurned,temfBurned, 
  fuelConsumption,inYear,metYear,zone,inSens) {
  
  var inEmiInv = getInEmiInv(inEmiInvName);
  var gridScale = getGridScale(inEmiInv);
  var gridArea = getGridArea(inEmiInv);
  
  var filterYr_adj = ee.Filter.calendarRange(metYear,metYear,'year');
  var filterYr = ee.Filter.calendarRange(inYear,inYear,'year');
  var filterMon = ee.Filter.calendarRange(sMonth,eMonth,'month');
  
  var sDate = ee.Date.fromYMD(inYear,sMonth,1);
  var eDate = ee.Date.fromYMD(inYear,eMonth,1);
  var nDays = eDate.difference(sDate,'day');
  
  // Sensitivity, fire season
  var sensProj = inSens.filter(filterYr_adj).filter(filterMon).sum();

  // OC, BC emissions (kg), fire season
  var emissProj = getProjEmiss(savaBurned,temfBurned, 
    fuelConsumption,inYear,metYear,zone);

  var oc = emissProj.select('OC');
  var bc = emissProj.select('BC');
  
  // Split into GEOS-Chem hydrophobic and hydrophilic fractions
  var oc_phobic = oc.multiply(0.5 * 2.1).rename('OCPO');
  var oc_philic = oc.multiply(0.5 * 2.1).rename('OCPI');

  var bc_phobic = bc.multiply(0.8).rename('BCPO');
  var bc_philic = bc.multiply(0.2).rename('BCPI');
  
  // 1. OC + BC emissions, kg
  var emissPart = bc_phobic.addBands(bc_philic).addBands(oc_phobic).addBands(oc_philic)
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
    
  // 2. Downscaled accumulated monthly sensitivity (0.25deg)
  // over the fire season, J / (kg / box)
  var sensPart = sensProj.multiply(sf_adjoint)
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
  
  // 3. Multiply OC + BC emissions rate by sensitivity
  // for smoke PM2.5 concentrations (μg m-3)
  var emissReceptorMon = emissPart.multiply(sensPart).reduce(ee.Reducer.sum())
    .reproject({crs: gridScale, scale: gridScale.nominalScale()});
    
  return emissReceptorMon;
};

var getSmokeRiskValsMap = function(inEmiInvName,savaBurned,temfBurned, 
  fuelConsumption,inputYear,metYear,receptor,zone,customLM) {
  
  var inEmiInv = getInEmiInv(inEmiInvName);
  var gridScale = getGridScale(inEmiInv);
  var inSens = getSensitivity(receptor,adjointFolder_ds);
  var zoneGeom = zoneGeomList[zone];
  
  var smokeRiskValsMap = getProjEmissReceptor(inEmiInvName,
    savaBurned,temfBurned, 
    fuelConsumption,inputYear,metYear,zone,inSens)
      .multiply(customLM)
      .reproject({crs: gridScale, scale: gridScale.nominalScale()});

  return smokeRiskValsMap;
};
exports.getSmokeRiskValsMap = getSmokeRiskValsMap;

var getSmokeRiskVals = function(smokeRiskValsMap,lmGrid,inputYear) {
  var smokeRiskVals = smokeRiskValsMap.unmask(0).reduceRegions({
    collection: lmGrid,
    reducer: ee.Reducer.sum().unweighted().setOutputs(['smoke_PM25']),
    crs: 'EPSG:4326',
    crsTransform: gfed_gridRes
  }).map(function(feature) {
      return feature
        .set('system:time_start',ee.Date.fromYMD(inputYear,1,1).millis());
    });
  
  return smokeRiskVals;
};
exports.getSmokeRiskVals = getSmokeRiskVals;

var getSmokeRiskIndexMap = function(inEmiInvName,savaBurned,temfBurned, 
  fuelConsumption,inputYear,metYear,receptor,zone,customLM) {
  
  var inEmiInv = getInEmiInv(inEmiInvName);
  var gridScale = getGridScale(inEmiInv);
  
  var zoneGeom = zoneGeomList[zone];
  var lmGrid = getLMGrid(zone);
  var lmGrid_size = lmGrid.size();
  
  var smokeRiskValsMap = getSmokeRiskValsMap(inEmiInvName,savaBurned,temfBurned, 
    fuelConsumption,inputYear,metYear,receptor,zone,customLM);
    
  var smokeRiskVals = getSmokeRiskVals(smokeRiskValsMap,lmGrid,inputYear)
      .sort('smoke_PM25',false);
      
  var smokeRiskThresh = ee.Dictionary(smokeRiskVals
    .aggregate_array('smoke_PM25')
    .reduce(ee.Reducer.percentile({percentiles:[0,25,50,75,90,95,99],maxRaw:lmGrid_size})))
    .toArray().toList().sort();
  
  var smokeRiskMap = ee.ImageCollection(smokeRiskThresh.map(function(percThresh) {
    return smokeRiskValsMap.gte(ee.Number(percThresh))
      .updateMask(smokeRiskValsMap.gt(0));
  })).sum();
  
  // fill in land areas with low risk, edges of zone
  // and force smoke value contribution = 0 to be low risk
  return smokeRiskMap.unmask(1).toInt().updateMask(landAreas);
};
exports.getSmokeRiskIndexMap = getSmokeRiskIndexMap;

exports.smokeRiskIndexLabels = ['7 (Extreme)','6','5 (High)','4','3 (Moderate)','2','1 (Low)'];

exports.smokeRiskColRamp = ['#FFFFFF','#EAD1DC', 
  '#FBC127','#F67D15','#D44842','#65146E','#000000'];
  
exports.smokeRiskColRampRev = ['#000000','#65146E',
  '#D44842','#F67D15','#FBC127','#EAD1DC','#FFFFFF'];

exports.scenarioColRamp = ['#000000','#252525','#525252','#737373','#969696',
  '#BDBDBD','#D9D9D9','#F0F0F0'];

exports.scenarioColRampRev = ['#F0F0F0','#D9D9D9','#BDBDBD','#969696','#737373',
  '#525252','#252525','#000000'];

var getPerDiffScenarioChart = function(inEmiInvName,zone,smokeRiskVals,
  smokeRiskVals_customLM,customLM,lmGrid,receptor,inputYear,metYear) {
    
  var inEmiInv = getInEmiInv(inEmiInvName);
  var gridScale = getGridScale(inEmiInv);
  var zoneGeom = zoneGeomList[zone];
  
  var base = smokeRiskVals.aggregate_sum('smoke_PM25');
  var custom = smokeRiskVals_customLM.aggregate_sum('smoke_PM25');
  
  var perDiff = (custom.subtract(base)).divide(base).multiply(100);
  
  var smokePM = getPM_annual(inEmiInvName,inputYear,metYear,receptor,zone)
    .getNumber('smoke_PM25');
  
  var excessDeaths_base = getExcessDeaths(inputYear,receptor,zone,smokePM)
    .getNumber('ExcessDeaths');
  var excessDeaths_custom = getExcessDeaths(inputYear,receptor,zone,
    smokePM.multiply(custom.divide(base)))
      .getNumber('ExcessDeaths');
  
  var perDiff_ED = (excessDeaths_custom.subtract(excessDeaths_base))
    .divide(excessDeaths_base).multiply(100);
  
  var avgLMI = customLM.clip(lmGrid).reduceRegions({
    collection: zoneGeom,
    reducer: ee.Reducer.mean().setOutputs(['LMI']),
    crs: gridScale,
    scale: gridScale.nominalScale()
  }).first().getNumber('LMI');
  
  var perDiffLMI = ee.FeatureCollection([
    ee.Feature(null,{
      Description: 'Average LMI',
      Value: ee.Number(1).subtract(avgLMI)
    }),
    ee.Feature(null,{
      Description: 'Smoke PM2.5 (% reduced)',
      Value: ee.Number(perDiff).multiply(10).round().divide(10)
    }),
    ee.Feature(null,{
      Description: 'Excess Deaths (% reduced)',
      Value: ee.Number(perDiff_ED).multiply(10).round().divide(10)
    })
  ]);
  
  return ui.Chart.feature.byFeature(perDiffLMI,'Description',['Value'])
    .setChartType('Table');
};
exports.getPerDiffScenarioChart = getPerDiffScenarioChart;

var getBAperChart = function(zone) {
  var BAper_annual = CONUS_BAper.filter(ee.Filter.eq('lm_zone',zone));
  
  return ui.Chart.feature.byFeature(BAper_annual,'year',['BAper_SAVA','BAper_TEMF'])
    .setSeriesNames(['SAVA','TEMF'])
    .setChartType('LineChart')
    .setOptions({
      hAxis: {
        title: 'Year',
        titleTextStyle: {fontSize: '12'},
        format: '####',
      },
      vAxis: {
        title: '% Area Burned',
        titleTextStyle: {fontSize: '12'}
      },
      series: {
        0: {color: '#C4B454'},
        1: {color: '#228B22'},
      }
    });
};
exports.getBAperChart = getBAperChart;

var getZoneReceptorPMChart = function(inEmiInvName, inputYear, metYear, receptor, zone) {
  var PMfrac_annual = getPMfrac_annual(inEmiInvName,inputYear,metYear,receptor,zone);
  
  var smokePM_zone = PMfrac_annual.getNumber('Zone');
  var smokePM_total = PMfrac_annual.getNumber('Total');
  
  var excessDeaths_zone = getExcessDeaths(inputYear,receptor,zone,smokePM_zone);
  var excessDeaths_total = getExcessDeaths(inputYear,receptor,zone,smokePM_total);
  var excessDeaths_per = excessDeaths_zone.getNumber('ExcessDeaths')
    .divide(excessDeaths_total.getNumber('ExcessDeaths'))
    .multiply(100);
  
  var zoneReceptorStats = ee.FeatureCollection([
    ee.Feature(null,{
      Variable: 'Smoke PM2.5',
      Zone: smokePM_zone.multiply(100).round().divide(100).format(),
      Total: smokePM_total.multiply(100).round().divide(100).format(),
      ZonePer: PMfrac_annual.getNumber('ZonePer')
        .multiply(10).round().divide(10)
    }),
    ee.Feature(null,{
      Variable: 'Excess Deaths',
      Zone: excessDeaths_zone.getNumber('ExcessDeaths').round().toInt().format().cat(' (')
        .cat(excessDeaths_zone.getNumber('ExcessDeaths_lower').round().toInt())
        .cat('-').cat(excessDeaths_zone.getNumber('ExcessDeaths_upper').round().toInt())
        .cat(')'),
      Total: excessDeaths_total.getNumber('ExcessDeaths').round().toInt().format().cat(' (')
        .cat(excessDeaths_total.getNumber('ExcessDeaths_lower').round().toInt())
        .cat('-').cat(excessDeaths_total.getNumber('ExcessDeaths_upper').round().toInt())
        .cat(')'),
      ZonePer: excessDeaths_per.multiply(10).round().divide(10)
    })
  ]);
  
  return ui.Chart.feature.byFeature(zoneReceptorStats,
      'Variable',['Zone','Total','ZonePer'])
    .setSeriesNames(['Zone','Total','%'])
    .setChartType('Table');
};
exports.getZoneReceptorPMChart = getZoneReceptorPMChart;

var getMetDiffSmokePMChart = function(PMts_annual) {

  return ui.Chart.feature.groups(PMts_annual,'fireYear','smoke_PM25','metYear')
    .setChartType('ScatterChart')
    .setOptions({
      hAxis: {
        title: 'Smoke PM2.5 (μg/m³), Annual',
        titleTextStyle: {fontSize: '12'}
      },
      vAxis: {
        textPosition: 'none',
        title: 'Fire Emissions Year',
        titleTextStyle: {fontSize: '12'}
      },
      orientation: 'vertical'
    });
};
exports.getMetDiffSmokePMChart = getMetDiffSmokePMChart;

var getMetDiffChart = function(PMts_annual) {
 
  return ui.Chart.feature.groups(PMts_annual,'fireYear','VPD','metYear')
    .setChartType('ScatterChart')
    .setOptions({
      hAxis: {
        title: 'VPD (Pa), Jul-Nov Avg.',
        titleTextStyle: {fontSize: '12'}
      },
      vAxis: {
        textPosition: 'none',
        title: 'Fire Emissions Year',
        titleTextStyle: {fontSize: '12'}
      },
      orientation: 'vertical',
    });
};
exports.getMetDiffChart = getMetDiffChart;

var getCVMetChart = function(PMts_annual) {
  
  var CVsmoke = PMts_annual.aggregate_total_sd('smoke_PM25')
    .divide(PMts_annual.aggregate_mean('smoke_PM25'));
  var CVmet = PMts_annual.aggregate_total_sd('VPD')
    .divide(PMts_annual.aggregate_mean('VPD'));
  
  var CV = ee.FeatureCollection([
    ee.Feature(null,{
      Variable: 'Smoke PM2.5',
      CV: CVsmoke,
      Min: PMts_annual.aggregate_min('smoke_PM25'),
      Max: PMts_annual.aggregate_max('smoke_PM25')
    }),
    ee.Feature(null,{
      Variable: 'VPD',
      CV: CVmet,
      Min: ee.Number(PMts_annual.aggregate_min('VPD')).round(),
      Max: ee.Number(PMts_annual.aggregate_max('VPD')).round()
    })
  ]);
  
  return ui.Chart.feature.byFeature(CV,'Variable',['Min','Max','CV'])
    .setChartType('Table');
};
exports.getCVMetChart = getCVMetChart;


// ----------------
// HEALTH ANALYSIS
// ----------------
var calcAF = function(vodonos, betaName, deltaPM) {
  var beta = vodonos.getNumber(betaName);
  var AF = (beta.multiply(deltaPM).exp().subtract(1))
    .divide(beta.multiply(deltaPM).exp());
  return AF;
 };
 
var getExcessDeaths = function(inputYear, receptor, zone, smokePM) {
  var popHealth = healthLookup.filter(ee.Filter.eq('receptor',receptor))
    .filter(ee.Filter.eq('year',inputYear)).first();

  var backgroundPM = ee.Number(popHealth.get('EPA_bPM25'));
  var totalPM = backgroundPM.add(smokePM);
  
  // filter by low and then high (get exact rows from floor)
  // PM2.5 values in table scaled by a factor of 10
  var vodonos = vodonos_meta
    .filter(ee.Filter.eq('pm25_low',backgroundPM.multiply(10).floor()))
    .filter(ee.Filter.eq('pm25_high',totalPM.multiply(10).ceil())).first();
  
  var AF = calcAF(vodonos,'mean_beta',smokePM);
  var AF_lower = calcAF(vodonos,'mean_beta_low',smokePM);
  var AF_upper = calcAF(vodonos,'mean_beta_high',smokePM);
  
  var pop = popHealth.getNumber('pop');
  var bmr = popHealth.getNumber('BMR').divide(1e5);
  
  var excessDeaths = AF.multiply(bmr).multiply(pop);
  var excessDeaths_lower = AF_lower.multiply(bmr).multiply(pop);
  var excessDeaths_upper = AF_upper.multiply(bmr).multiply(pop);

  return popHealth.set({
    'PM25_background': backgroundPM,
    'PM25_total': totalPM,
    'PM25_smoke': smokePM,
    'year': inputYear,
    'receptor': receptor,
    'AF_lower': AF_lower,
    'AF': AF,
    'AF_upper': AF_upper,
    'ExcessDeaths_lower': excessDeaths_lower,
    'ExcessDeaths': excessDeaths,
    'ExcessDeaths_upper': excessDeaths_upper
  });
};
exports.getExcessDeaths = getExcessDeaths;
