
var mrpTest = (function() {
	/*** Variables: ***/
	var apiKey = "api_key=yMGf4Ng0hX92bomOydAaf2x5qoJj9drNfD7fXgZc";
	var manifest, selectedRover, selectedDate, selectedCamera, dateType, loadInterval = null;
	var url = "https://api.nasa.gov/mars-photos/api/v1/rovers/";
	
	// Function to call when page is loaded:
	function init() {
		// Disable inputs until manifests are available:
		for (let sectionName of ["rover", "date", "camera", "page", "submit"])
			disable(sectionName);
		
		// Request rover manifests:
		var cxhttp = new XMLHttpRequest(); // Curiosity
		cxhttp.open("GET",'https://api.nasa.gov/mars-photos/api/v1/manifests/curiosity?' + apiKey);
		cxhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
			   document.getElementById("curiosityManifest").innerHTML = this.responseText;
			}
		};
		cxhttp.send();
		
		
		// Commented code to request Opportunity and Spirit manifests:
		// These rovers are inactive and so we can store the manifests locally instead.
		/*var oxhttp = new XMLHttpRequest(); // Opportunity
		oxhttp.open("GET",'https://api.nasa.gov/mars-photos/api/v1/manifests/opportunity?' + apiKey);
		oxhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
			   document.getElementById("opportunityManifest").innerHTML = this.responseText;
			}
		};
		oxhttp.send();
		
		var sxhttp = new XMLHttpRequest(); // Spirit
		sxhttp.open("GET",'https://api.nasa.gov/mars-photos/api/v1/manifests/spirit?' + apiKey);
		sxhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
			   document.getElementById("spiritManifest").innerHTML = this.responseText;
			}
		};
		sxhttp.send(); */
		
		
		// Check for manifest data:
		loadInterval = setInterval(function() {
			if (document.getElementById("curiosityManifest").innerHTML != ""
				&& document.getElementById("opportunityManifest").innerHTML != ""
				&& document.getElementById("spiritManifest").innerHTML != "") {
				// Manifests have returned, clear timeout:
				clearInterval(loadInterval)
				// Enable rover selection:
				enable("rover");
			}
		}, 500);
		
		/*** Event Listeners ***/
		
		// Rover selection input event listeners:
		for (let inputElem of document.getElementsByClassName("form-section-rover")[0].getElementsByTagName("input")) {
			inputElem.addEventListener("change", function(event) {
				// Disable dependent inputs:
				for (let sectionName of ["date", "camera", "page", "submit"])
					disable(sectionName);
				
				// Load manifest:
				selectedRover = event.target.id;
				manifest = JSON.parse(document.getElementById(event.target.id + "Manifest").innerHTML);
				
				// Enable dependent inputs:
				enable("date");
			});
		}
		// Date selection input event listeners:
		document.getElementById("earthDate").addEventListener("change", dateChange);
		document.getElementById("solDate").addEventListener("change", dateChange);
		
		// Submit button event listener:
		document.getElementById("submit").addEventListener("click", function() {
			callAPI();
		});
	}
	
	/*** Helper functions: ***/
	
	// Handle date selection events:
	function dateChange(event) {
		// Disable dependent inputs:
		for (let sectionName of ["camera", "page", "submit"])
			disable(sectionName);
		// Find selected date in manifest:
		switch (event.target.id) {
			case "earthDate" :
				selectedDate = manifest.photo_manifest.photos.find(x => x.earth_date == event.target.value);
				dateType = "earth";
				break;
			case "solDate" :
				selectedDate = manifest.photo_manifest.photos.find(x => x.sol == event.target.value);
				dateType = "martian";
		}
		if (selectedDate) {// Enable dependent inputs:
			for (let sectionName of ["camera", "page", "submit"])
				enable(sectionName);
			
		}
	}
	// Enable form section by name:
	function enable(sectionName) {
		document.getElementsByClassName("form-section-" + sectionName)[0].classList.toggle("disabled", false);
		if (sectionName != "camera" )
			for (let inputElem of document.getElementsByClassName("form-section-" + sectionName)[0].getElementsByTagName("input"))
				inputElem.removeAttribute("disabled");
		switch (sectionName) {
			case "submit" :
				document.getElementById("submit").removeAttribute("disabled");
				break;
			case "date" : // Set constraints based on manifest:
				document.getElementById("earthDate").setAttribute("min", manifest.photo_manifest.landing_date);
				document.getElementById("earthDate").setAttribute("max", manifest.photo_manifest.max_date);
				document.getElementById("earthRange").innerHTML = "( " + manifest.photo_manifest.landing_date + " - " + manifest.photo_manifest.max_date + " )";
				document.getElementById("solDate").setAttribute("max", manifest.photo_manifest.max_sol);
				document.getElementById("solRange").innerHTML = "( 0 - " + manifest.photo_manifest.max_sol + " )";
				break;
			case "camera" :
				for (let camera of selectedDate.cameras) {
					let inputElem = document.getElementById(camera);
					if (inputElem) { // Avoid undocumented camera names.
						inputElem.removeAttribute("disabled");
						inputElem.parentNode.classList.toggle("disabled", false);
					}
					document.getElementById("allCams").removeAttribute("disabled");
					document.getElementById("allCams").checked = true;
					document.getElementById("allCams").parentNode.classList.toggle("disabled", false);
				}
				break;
			case "page" :
				document.getElementById("pageNum").value = 1;
				let maxPage = parseInt(selectedDate.total_photos / 25);
				if (selectedDate.total_photos % 25 != 0 || maxPage == 0)
					maxPage++;
				document.getElementById("pageNum").setAttribute("max", maxPage);
				document.getElementById("pageRange").innerHTML = "( 1 - " + maxPage + " )";
		}
	}
	// Disable form section by name:
	function disable(sectionName) {
		document.getElementsByClassName("form-section-" + sectionName)[0].classList.toggle("disabled", true);
		for (let inputElem of document.getElementsByClassName("form-section-" + sectionName)[0].getElementsByTagName("input")) {
			if (sectionName == "camera") inputElem.checked = false;
			else inputElem.value = "";
			inputElem.setAttribute("disabled", "true");
		}
		switch (sectionName) {
			case "submit" :
				document.getElementById("submit").setAttribute("disabled", "true");
				break;
			case "date" :
				document.getElementById("earthRange").innerHTML = "";
				document.getElementById("solRange").innerHTML = "";
				selectedDate = null;
				break;
			case "camera" :
				for (let cam of document.getElementsByClassName("cam")) {
					cam.classList.toggle("disabled", true);
				}
				selectedCamera = null;
				break;
			case "rover" :
				selectedRover = null;
				break;
			case "page" :
				document.getElementById("pageRange").innerHTML = "";
		}
	}
	// Request image data:
	function callAPI() {
		// Form http request:
		let request = url + selectedRover + "/photos?"
		if (dateType == "martian") request += "sol=" + selectedDate.sol;
		else request += "earth_date=" + selectedDate.earth_date;
		selectedCamera = null;
		for (let cam of document.getElementsByClassName("form-section-camera")[0].getElementsByTagName("input"))
			if (cam.id != "allCams" && cam.checked)
				selectedCamera = cam.id;
		if (selectedCamera != null)
			request += "&camera=" + selectedCamera;
		request += "&page=" + document.getElementById("pageNum").value + "&" + apiKey;
		// Note request start time:
		var startTime = Date.now();
		// Make request:
		var xhttp = new XMLHttpRequest();
		xhttp.open("GET", request);
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				var resultObj = JSON.parse(this.responseText);
				
				// Append meta-results to table:
				var requestTime = Date.now() - startTime;
				var rTable = document.getElementById("response");
				
				var row = document.createElement("tr");
				var cell = document.createElement("td");
				cell.innerHTML = request;
				row.appendChild(cell);
				
				cell = document.createElement("td");
				cell.innerHTML = this.responseText.length;
				row.appendChild(cell);
				
				cell = document.createElement("td");
				cell.innerHTML = requestTime + "ms";
				row.appendChild(cell);
				
				rTable.appendChild(row);
				
				// Display images:
				document.getElementById("images").innerHTML = "";
				for (let image of resultObj.photos) {
					let imgElem = document.createElement("img");
					imgElem.src = image.img_src;
					let imgContainer = document.createElement("div");
					imgContainer.classList.add("img");
					imgContainer.appendChild(imgElem);
					document.getElementById("images").appendChild(imgContainer);
				}
			}
		};
		xhttp.send();
	}
	function getManifest() {
		return manifest;
	}
	return {
		init : init,
		getManifest: getManifest
	};
})();

/*** Initialize Mars Rover Photos API Test ***/
window.onload = function mrpInit() {
	mrpTest.init();
};

