chrome.runtime.onInstalled.addListener(function() {

	var device = "";
	var updateRate = 50;
	var updatequeue = [];

	//Device name stuff
	chrome.storage.local.get("deviceName", function(data) {
		if(!data.hasOwnProperty("deviceName")) {
			chrome.storage.local.set({ deviceName: 'Unknown' }, function() {
				console.log("Storage reinitiated, devicename reset to Unknown");
				device = 'Unknown';
			});
		} else {
			console.log("Storage already initiated, deviceName = " + data.deviceName);
			device = data.deviceName;
		}
	});


	//Get history from before install
	chrome.storage.local.get("history", function(data) {
		if(!data.hasOwnProperty("history")) {
			chrome.identity.getProfileUserInfo(function(id) {
				var xhr = new XMLHttpRequest();
				xhr.open("POST", 'https://filipkin.com/whib/get-sheet.php?email=' + encodeURIComponent(id.email), true);
				xhr.onreadystatechange = function() {
					if(xhr.readyState == 4) {
						var resp = JSON.parse(xhr.responseText);
						if (resp.status[0] == "exists") {
							console.log("History storage already initiated, id = " + resp.status[1])
							chrome.storage.local.set({history: resp.status[1]}, function() {
								console.log("Recorded sheet id of history");
							});
						} else {
							var query = { 
								text: "",
								startTime: 1,
								maxResults: 1000000
							}
							chrome.history.search(query, function(results) {
								var out = [];
								var lasttime = 10000000000000.00;
								results.forEach(function(obj) {
									console.debug(obj);
									var direct = false;
									if (obj.typedCount != 0) direct = true;
									var timestamp = obj.lastVisitTime;
									if (obj.visitCount != 1) {
										timestamp = lasttime;
									} else {
										lasttime = timestamp;
									}
									var t = new Date(timestamp);
									var tzTime = (t.getHours())+":"+(t.getMinutes())+":"+(t.getSeconds())+" "+(t.getMonth()+1)+"/"+(t.getDate())+"/"+(t.getFullYear());
									var outobj = {
										"id": obj.id,
										"title": obj.title,
										"url": obj.url,
										"time": tzTime
									};
									out.push(outobj);
								});
								console.debug(out);
								chrome.identity.getProfileUserInfo(function(id) {
									var xhr = new XMLHttpRequest();
									var json = JSON.stringify(out);
									xhr.open("POST", 'https://filipkin.com/whib/init-sheet.php?device=Synchronized&email=' + encodeURIComponent(id.email), true);
									xhr.onreadystatechange = function() {
										if(xhr.readyState == 4) {
											var resp = JSON.parse(xhr.responseText);
											if (resp.status[0] == "exists") {
												console.log("History storage already initiated, id = " + resp.status[1])
												chrome.storage.local.set({history: resp.status[1]}, function() {
				
												});
											} else if (resp.status[0] == "created") {
												console.log("History storage initiated, id = " + resp.status[1])
												chrome.storage.local.set({history: resp.status[1]}, function() {
												});
											} else {
												console.log("History init failed: " + JSON.stringify(resp.status))
											}
										}
									}
									xhr.send(json);
								});
							});
						}
					}
				}
				xhr.send();
			});
		} else {
			console.log("History storage already initiated, id = " + data.history);
		}
	});


	//Update rate stuff
	chrome.storage.local.get("updateRate", function(data) {
		if(!data.hasOwnProperty("updateRate")) {
			chrome.storage.local.set({ updateRate: 50 }, function() {
				console.log("Storage reinitiated, updaterate reset to 50 websites");
				updateRate = 50;
			});
		} else {
			console.log("Storage already initiated, updateRate = " + data.updateRate);
			updateRate = data.updateRate;
		}
	});


	//Get stored updatequeue buffer
	chrome.storage.local.get("updatequeue", function(data) {
		if(data.hasOwnProperty("updatequeue")) {
			console.log("Restoring updatequeue buffer from last session");
			updatequeue = data.updatequeue;
		} else {
			console.log("No updatequeue buffer to restore");
		}
	});

	//Add to history when tab changes
	chrome.tabs.onUpdated.addListener(function(tabId, chgInfo, tab) {
		if (chgInfo.status == "complete") {
			console.debug(chgInfo);
			console.debug(tab);
			var t = new Date();
			var tzTime = (t.getHours()) + ":" + (t.getMinutes()) + ":" + (t.getSeconds()) + " " + (t.getMonth() + 1) + "/" + (t.getDate()) + "/" + (t.getFullYear());
			console.debug(tzTime);
			var outobj = {
				"id": tab.id,
				"title": tab.title,
				"url": tab.url,
				"time": tzTime
			};
			console.debug(outobj);
			console.debug(updatequeue);
			updatequeue.push(outobj);
			chrome.storage.local.set({ updatequeue: updatequeue }, function() {
				console.debug('Backed up updatequeue buffer');
			});
			console.debug(updatequeue.length + " " + updateRate);
			if (updatequeue.length >= updateRate) {
				chrome.storage.local.get('history', function(data) {
					var json = JSON.stringify(updatequeue);
					var xhr = new XMLHttpRequest();
					xhr.open("POST", 'https://filipkin.com/whib/update-sheet.php?id=' + encodeURIComponent(data.history) + '&device=' + encodeURIComponent(device), true);
					xhr.onreadystatechange = function() {
						if(xhr.readyState == 4) {
							var resp = JSON.parse(xhr.responseText);
							updatequeue = [];
						}
					}
					xhr.send(json);
				});
			}
		}
	});
});
