(function(w){
	var gui = require('nw.gui'),
		fs = require('fs'),
		spawn = require('child_process').spawn;  

	var menus = [
		{ label: 'Remove PTU Profile', click: function() {

			    var url = 'chrome-extension://'+chrome.runtime.id+'/remove.html'
			    var win = gui.Window.open (url, {
				  position: 'center', 
				  width: 659,
				  height: 276,
				  focus: true,
				  id: 'remove',
				  inject_js_start: 'inject.js'
				});
			} 
		},
		{ label: 'PTU Launcher', click: function() {
				var l = Auto.getRSIPath(true);
				if (fs.existsSync(l)) {
			    	spawn(l, [], {detached: true});
			    }else{
			    	Auto.notify('Failed', 'PTU Launcher not found: ' + l)
			    }
			} 
		},
		{ label: 'LIVE Launcher', click: function() {
				var l = Auto.getRSIPath(false);
			    if (fs.existsSync(l)) {
			    	spawn(l, [], {detached: true});
			    }else{
			    	Auto.notify('Failed', 'LIVE Launcher not found at: ' + l)
			    }
			} 
		},
	]
			    //C:\Program Files\Roberts Space Industries\RSI Launcher\RSI Launcher.exe
			    //C:\Program Files\Roberts Space Industries\RSI PTU Launcher\RSI PTU Launcher.exe

	const notifier = require('node-notifier');
	// const path = require('path');

	console.log(location.toString())

	var nullObj = (function(){
		var ret = {}
		ret.click = ret.focus = function(callback){
			
			if (typeof callback == 'function') {
				console.log('Sorry: Expect DOM missing')
				callback();

			}else{
				console.log('Sorry', 'Expect DOM missing')
			}
		}
		return ret;
	})();

	var Auto = {
		base:"https://robertsspaceindustries.com",
		extension: 'chrome-extension://'+chrome.runtime.id,
		intervalHandle: null,
		goTo: function (action){
			location.href = Auto.base + action;
		},
		getDom:function(path, inDom){
			if (!!!path) return [];
			inDom = inDom || document;
			// console.log(inDom)
			var retArray = []
			//debugger
			try {
				var heading = document.evaluate((inDom==document?'//':'.//')+path, inDom, null, XPathResult.ANY_TYPE, null )
				a = heading.iterateNext()
				while (a){
					retArray.push(a)
					a = heading.iterateNext()
				}
			}catch(ex){
				console.log('Evaluate failed')
			}
			return retArray;
		},
		getOneDom: function(path, inDom, index){
			inDom = inDom || document;
			index = index || 0;
			var a = Auto.getDom(path, inDom);
			return (!!a && a.length && a.length > index) ? a[index]:nullObj;
		},
		doTop: function (){
			Auto.getOneDom('button[@id="overlay_close"]').click();

			
			Auto.getOneDom('a[text()="Settings"]').click( function (){
					Auto.notify('Sorry', 'You need login first')
					Auto.getOneDom('a[@href="/account/settings"]').click();
					Auto.getOneDom('input[@name="login_id"]').focus();
				}
			);
	 
			Auto.addMenu();

			return this;
		},
		locIs: function(loc){
			return document.location == (Auto.base + loc);
		},
		getAction: function(){
			return document.location.toString().replace(Auto.base,'').replace(Auto.extension);
		},
		checkPTU: function (notifyNotPTUyet){
			//var item = Auto.getOneDom('a[not(@href)]', document.getElementById('settings'))
			//console.log(item && Auto.getOneDom('span[text()="PUBLIC TEST UNIVERSE"]', item))
			Auto.count = 0;

			if (Auto.getOneDom('div[@id="settings"]//li[@class=" disabled"]/a/span[text()="PUBLIC TEST UNIVERSE"]')!==nullObj){
				if (Auto.count % 2 == 0 && notifyNotPTUyet){
					clearInterval(Auto.interval);
					Auto.notify('Sorry', 'Your PTU is still not availbled, please continue waiting\r\nClick close to only notify when availabled.', function(err,response){
						if (response !== 'the user dismissed this toast'){
							Auto.interval = setInterval(function(){
								Auto.checkPTU(true)
							}, 1000*60)
							
						}else{
							Auto.interval = setInterval(function(){
								Auto.checkPTU(false)
							}, 1000*60)
						}
					})
				}
			}else{
				clearInterval(Auto.interval);
				setTimeout(function(){
					let ai = Auto.getOneDom('div[@id="settings"]//li/a/span[text()="PUBLIC TEST UNIVERSE"]')
					ai.scrollIntoView({behavior:'smooth', inline:'center' })

					ai.style.border = '1px solid lightgreen'

					Auto.notify('Congraz!', 'Your PTU is now availbled')
				},1200)
			}
			Auto.count ++; 

			//return (Auto.getOneDom('div[@id="settings"]//li[@class=" disabled"]/a/span[text()="PUBLIC TEST UNIVERSE"]')==null)
		},
		notify: function(title, message, cb){
			if (typeof cb !== 'function'){
				var cb =function(err, response) {}
			}
			notifier.notify(
				  {
				    title: title,
				    message: message,
				    timeout: 5,
				    icon:'icon.ico',
				    //icon: path.join(__dirname, 'coulson.jpg'), // Absolute path (doesn't work on balloons)
				    sound: true, // Only Notification Center or Windows Toasters
				    wait: true // Wait with callback, until user action is taken against notification
				  },
				  cb
				);

		},
		addMenu: function(exceptAction){
			// debugger
			if (Auto.getAction().match(exceptAction)) return

			Auto.your_menu = new nw.Menu({ type: 'menubar' })
			// the menu item appended should have a submenu
			menus.map(function(item){
				Auto.your_menu.append( new nw.MenuItem(item)	)
			})
			
			nw.Window.get().menu = Auto.your_menu;
		},
		addTray: function(exceptAction){

			if (Auto.getAction().match(exceptAction)) return
			// Load library
		    // var gui = require('nw.gui');
		    
		    // Reference to window and tray
		    var win = gui.Window.get();
		    var tray;

		    // Get the minimize event
		    win.on('minimize', function() {
		      // Hide window
		      this.hide();

		      // Show tray
		      tray = new gui.Tray({ title: 'PTU Tools', icon: 'icon.png' });

		      tray.menu = Auto.your_menu;

		      // Show window and remove tray when clicked
		      tray.on('click', function() {
		        win.show();
		        this.remove();
		        tray = null;
		      });
		    });
		},
		getRSIPath: function (ptu, insDir){

			var search = ptu? 'RSI PTU Launcher': 'RSI Launcher',
				sc = ptu? 'StarCitizenPTU': 'StarCitizen'

			var insDir = !!insDir || false,
		        ptuLaunch = ''

		    const path = require('path');
		    const { execSync } = require('child_process');

		    try{
		        ptuLaunch = execSync('reg.exe query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall /f "'+ search +'" /s').toString(); // 
		    }catch(e){
		        console.log(e,ptuLaunch)
		    }
		    
		    if (ptuLaunch)
		        ptuLaunch = ptuLaunch.match(/UninstallString[^\"]*"([^\"]*)/)[1] //C:\Program Files\Roberts Space Industries\RSI PTU Launcher\Uninstall RSI PTU Launcher.exe
		    
	    	if (insDir){
	    		ptuLaunch = ptuLaunch && path.dirname(ptuLaunch)
	    		return ptuLaunch.replace(search, sc) || process.env.ProgramFiles+'\\Roberts Space Industries\\'+ sc
	    	}else{
	        	ptuLaunch = ptuLaunch && ptuLaunch.replace('Uninstall ')
	        	return ptuLaunch || process.env.ProgramFiles+'\\Roberts Space Industries\\'+ search +'\\'+ search +'.exe';
	        }
		    //C:\Program Files\Roberts Space Industries\RSI PTU Launcher\Uninstall RSI PTU Launcher.exe vs RSI PTU Launcher.exe
		    

		}

	}
	console.log(parent, window)

	Auto.getOneDom('a/span[text()="Accept And Close"]').click()
	Auto.getOneDom('a/span[text()="Accept And Close"]').click()

	Auto.addMenu(/remove\.html/);
	Auto.addTray(/remove\.html/);

	switch (Auto.getAction()){
		case '/': 
			Auto.doTop(); 
			break;
		case '/account/settings': 
			setTimeout(function(){
				var ai = Auto.getOneDom('div[@id="settings"]//li/a/span[text()="PUBLIC TEST UNIVERSE"]')
				ai.scrollIntoView({behavior:'smooth', inline:'center' })
				ai.style.border = '1px solid red'
			}, 1000)
			Auto.checkPTU(true);
			break;
		default: 
			console.log();
	}

	w._auto = {
		notify: Auto.notify,
		createMenu: function(){Auto.addMenu(/remove\.html/)},
		createTray: Auto.createTray,
		getRSIPath: Auto.getRSIPath,
		get1: Auto.getOneDom,
		getStyle: function (a){
			JSON.stringify(window.getComputedStyle(a, null))
		}
	}

 })(window)