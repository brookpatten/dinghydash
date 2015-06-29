/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vector2 = require('vector2');
var Vibe = require('ui/vibe');

var startTime;
var lastPos;
var lastPosAt;
var previousPos;
var previousPosAt;

var marks = new Array();
var targetMarkIndex=null;

var main = new UI.Window();
main.show();
var timerId=setInterval(display,1000);
init();

var positionWatcherId;

Pebble.addEventListener('ready',init);

var headingText;
var speedText;
var timeText;
var knotConversion = 1.94384;

main.on('click', 'down',function(e){
  console.log('down');
  var now = Date.now();
  
  if(startTime && startTime > now){
    var difference = startTime-now;
    var delta = (difference % 60000);
    console.log('subtracting '+(delta/1000));
    startTime = new Date(startTime - delta + 1000);
    console.log('new start '+startTime);
    save();
    Vibe.vibrate('short');
  }
  else if(lastPos!=null){
    appendMark(lastPos);
    Vibe.vibrate('short');
  }
  
});

main.on('click', 'up',function(e){
  console.log('up');
  var now = Date.now();
    
  if(startTime && startTime > now){
    var difference = startTime.valueOf()-now.valueOf();
    var delta = difference % 60000;
    var inverse = 60000 - delta;
    console.log('adding '+inverse/1000);
    startTime = new Date(startTime.valueOf() + inverse + 1000);
    console.log('new start '+startTime);
    save();
    Vibe.vibrate('short');
  }
  else if(lastPos!=null){
    appendMark(lastPos);
    Vibe.vibrate('short');
  }
});

main.on('click', 'select',function(e){
  console.log('select');

  startTime = new Date(Date.now() + (5 * 60 * 1000));//now + 5 minutes
  marks=new Array();//clear out any marks leftover from a previous race
  console.log('setting starttime to '+startTime);
  save();
  
  Vibe.vibrate('short');
});

function save(){
  localStorage.setItem("startTime", startTime.valueOf());
  localStorage.setItem("marks",JSON.stringify(marks));
}

function load(){
  var millis = localStorage.getItem("startTime");
  console.log('loaded startTime'+millis);
  if(millis!=null){
    startTime = new Date(parseInt(millis));
  }
  marks = JSON.parse(localStorage.getItem('marks'));
}

function appendMark(pos){
  if(marks.length < 2 || marks[marks.length-1].name=="leeward"){
    pos.name="windward";
  }
  else{
    pos.name="leeward";
  }
  marks.push(pos);
  save();
  console.log('marked '+pos.name);
  if(marks.length>=2){
    console.log('new target mark is '+marks[marks.length-2].name);
  }
}


function locationSuccess(pos) {
  //console.log(JSON.stringify(pos));
  display(pos);
}

function locationError(err) {
  console.log('location error (' + err.code + '): ' + err.message);
  display(null);
}
                        
function init(e) {
  load();
  
  // Request current position
  var locationOptions = {
    enableHighAccuracy: true, 
    maximumAge: 0, 
    timeout: 10000
  };
  positionWatcherId = navigator.geolocation.watchPosition(locationSuccess, locationError, locationOptions);
  //navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
  display(null);
}

function display(pos){
  var now = Date.now();
  
  
  if(pos!=null){
    previousPos=lastPos;
    previousPosAt = lastPosAt;
    
    //if we have new data, update it
    //console.log('new data');
    lastPos=pos;
    lastPosAt=now;
  }
  else if(lastPos!=null && now - lastPosAt > 5000){
    //if the data is old, clear it
    console.log('existing data is old');
    lastPos=null;
    lastPosAt=null;
    previousPos=null;
    previousPosAt=null;
  }
  
  if(pos==null && startTime!=null && startTime>=now){
    //do ticks
    var difference = new Date(startTime.valueOf() - now.valueOf());
    
    //console.log('tick '+difference.getMinutes()+', '+difference.getSeconds());
    
    if(difference.getMinutes()==0){
      if(difference.getSeconds()==0){
        Vibe.vibrate('long');
        
        lastPos.name="leeward";
        marks.push(lastPos);
        save();
        console.log('marked start (leeward)');
      }
      else if(difference.getSeconds()<10){
        Vibe.vibrate('short');
      }
    }
    else{
      if(difference.getSeconds()==0){
        Vibe.vibrate('short');
      }
    }
    
  }
  
  if(timeText==null){
      timeText = new UI.Text({
        position: new Vector2(0, 10),
        size: new Vector2(144, 15),
        font: 'bitham-42-bold',
        text:"-",
        color: 'white',
        textAlign: 'center'
      });
      main.add(timeText);
    
      speedText = new UI.Text({
        position: new Vector2(0, 55),
        size: new Vector2(144, 15),
        font: 'bitham-42-bold',
        text:"--",
        color: 'white',
        textAlign: 'center'
      });
      main.add(speedText);
    
      headingText = new UI.Text({
        position: new Vector2(0, 100),
        size: new Vector2(144, 15),
        font: 'bitham-42-bold',
        text: "---",
        color: 'white',
        textAlign: 'center'
      });
      main.add(headingText);
  }
  
  if(startTime!=null && startTime > now){
    var millis = startTime - now;
    timeText.text(msToTime(millis));
  }
  else if(marks!=null && marks.length > 1 && previousPos!=null && lastPos!=null){
    var val = vmc(previousPos,previousPosAt,lastPos,lastPosAt,marks[marks.length-2]);
    timeText.text(val.toFixed(1)+marks[marks.length-2].name.substring(0,1).toUpperCase());
  }
  else if(marks!=null && marks.length==1){
    timeText.text("W");//we can safely assume we're starting to windward at least
  }
  else{
    timeText.text("---");
  }
  
  if(lastPos!=null && previousPos!=null){
    var val = speed(previousPos,previousPosAt,lastPos,lastPosAt);
    speedText.text(val.toFixed(1)+"");
    headingText.text(lastPos.coords!=null && lastPos.coords.heading!=null && !isNaN(lastPos.coords.heading) ? (lastPos.coords.heading).toFixed(1)+"°":"---");
  }
  else if(lastPos!=null){
    speedText.text(lastPos.coords!=null && lastPos.coords.speed!=null && !isNaN(lastPos.coords.speed) ? (lastPos.coords.speed * knotConversion).toFixed(1)+"" : "---");
    headingText.text(lastPos.coords!=null && lastPos.coords.heading!=null && !isNaN(lastPos.coords.heading) ? (lastPos.coords.heading).toFixed(1)+"°":"---");
  }
  else{
    speedText.text("---");
    headingText.text("---");  
  }
}

function msToTime(duration) {
    var milliseconds = parseInt((duration%1000)/100)
        , seconds = parseInt((duration/1000)%60)
        , minutes = parseInt((duration/(1000*60))%60)
        , hours = parseInt((duration/(1000*60*60))%24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return /*hours + ":" +*/ minutes + ":" + seconds /*+ "." + milliseconds*/;
}

function distance(pos1,pos2) {
 
	// Convert degrees to radians
	var lat1 = pos1.coords.latitude * Math.PI / 180.0;
	var lon1 = pos1.coords.longitude * Math.PI / 180.0;
 
	var lat2 = pos2.coords.latitude * Math.PI / 180.0;
	var lon2 = pos2.coords.longitude * Math.PI / 180.0;
 
	// radius of earth in metres
	var r = 6378100.0;
  //altitude correction of possible
  //if(pos1.coords.altitude!=null){
    //r = r+pos1.coords.altitide;
  //}
 
	// P
	var rho1 = r * Math.cos(lat1);
	var z1 = r * Math.sin(lat1);
	var x1 = rho1 * Math.cos(lon1);
	var y1 = rho1 * Math.sin(lon1);
 
	// Q
	var rho2 = r * Math.cos(lat2);
	var z2 = r * Math.sin(lat2);
	var x2 = rho2 * Math.cos(lon2);
	var y2 = rho2 * Math.sin(lon2);
 
	// Dot product
	var dot = (x1 * x2 + y1 * y2 + z1 * z2);
	var cos_theta = dot / (r * r);
 
	var theta = Math.acos(cos_theta);
 
	// Distance in Metres
	return r * theta;
}

//this is haversine speed, we'll stick to the speed returned by the phone for now
function speed(pos1,at1,pos2,at2){
  var dist = distance(pos2,pos1);
  var time_s = (at2.valueOf() - at1.valueOf()) / 1000.0;
  var speed_mps = dist / time_s;
  return speed_mps * knotConversion;
}

function vmc(pos1,at1,pos2,at2,mark){
  var dist1 = distance(pos1,mark);
  var dist2 = distance(pos2,mark);
  var time_s = (at2.valueOf() - at1.valueOf()) / 1000.0;
  
  //console.log('vmc dist1='+dist1+' dist2='+dist2+' time_s='+time_s);
  
  var vmc_mps = (dist1-dist2) / time_s;
  
  return vmc_mps * knotConversion;
}