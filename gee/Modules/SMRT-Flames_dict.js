// Assign default adjoint year based on VPD
var closestMetYearList = {
  'NorCal': {
    2003: 2016,
    2004: 2016,
    2005: 2016,
    2006: 2019,
    2007: 2016,
    2008: 2017,
    2009: 2019,
    2010: 2016,
    2011: 2016,
    2012: 2019,
    2013: 2016,
    2014: 2019,
    2015: 2016,
    2016: 2016,
    2017: 2017,
    2018: 2018,
    2019: 2019,
    2020: 2020,
    2021: 2021,
    2022: 2021,
    2023: 2016
  },
  'WEST': {
    2003: 2021,
    2004: 2016,
    2005: 2019,
    2006: 2016,
    2007: 2017,
    2008: 2016,
    2009: 2019,
    2010: 2016,
    2011: 2018,
    2012: 2021,
    2013: 2016,
    2014: 2016,
    2015: 2016,
    2016: 2016,
    2017: 2017,
    2018: 2018,
    2019: 2019,
    2020: 2020,
    2021: 2021,
    2022: 2017,
    2023: 2017
  }
};

var getClosestMetYear = function(zone) {
  return closestMetYearList[zone];
};

exports.getClosestMetYear = getClosestMetYear;


// BA fraction, during high fire year (e.g., 2020)
var baFracList = {
  'NorCal': {
    'SAVA': 5.85,
    'TEMF': 9.33
  }
};

exports.baFracList = baFracList;
