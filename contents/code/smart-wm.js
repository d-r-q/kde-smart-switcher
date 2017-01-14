var apps = [
{shortcutName: "Firefox", shortcut: "Meta+1", classRegexp: /.*firefox.*/, launcherQuery: "firefox"},
{shortcutName: "Chromium", shortcut: "Meta+2", classRegexp: /.*chromium-browser.*/, launcherQuery: "chromium-browser"},
{shortcutName: "Thunderbird", shortcut: "Meta+3", classRegexp: /.*thunderbird.*/, launcherQuery: "thunderbird"},
{shortcutName: "SublimeText", shortcut: "Meta+Q", classRegexp: /.*sublime_text.*/, launcherQuery: ["subl", "-n"]},
{shortcutName: "IDEA", shortcut: "Meta+W", classRegexp: /.*jetbrains\-idea.*/, launcherQuery: "/opt/jetbrains/idea-ue/stable/bin/idea.sh"},
{shortcutName: "Konsole", shortcut: "Meta+E", classRegexp: /.*konsole.*/, launcherQuery: "konsole"},
{shortcutName: "Dolphin", shortcut: "Meta+D", classRegexp: /.*dolphin.*/, launcherQuery: "dolphin"},
{shortcutName: "Yandex.Music", shortcut: "Meta+Z", classRegexp: /.*yandex-music.*/, launcherQuery: "/opt/yandex/Yandex.Music/Yandex.Music"},
{shortcutName: "Skype", shortcut: "Meta+X", classRegexp: /.*skypeforlinux.*/, launcherQuery: "skypeforlinux"},
{shortcutName: "Telegram", shortcut: "Meta+C", classRegexp: /.*telegram.*/, launcherQuery: "/opt/Telegram/Telegram"}
];

var knownClasses = new Array();
apps.forEach(function(app) {
	knownClasses.push(app.classRegexp);
});

function printProps(obj) {
	for (var p in obj) {
		print(p);
	}
}

function createWindowClassMatcher(windowClass) {
	return function(client) {
		var classMatches = windowClass.test(client.resourceClass);
		var activityMatches = workspace.activities.length == 1 || client.activities.length == 0 || client.activities.indexOf(workspace.currentActivity) != -1;
		var desktopMatches = (client.onAllDesktops || client.desktop == workspace.currentDesktop);
		return classMatches && activityMatches && desktopMatches;
	}
};

function createLauncher(launcher) {
	return function() {
	   callDBus("org.kde.krunner","/App","org.kde.krunner.App","query", launcher);
	   //var arglist = new Array(launcher);
	   //callDBus("org.kde.klauncher5", "/KLauncher", "org.kde.KLauncher","exec_blind", "kshell4", arglist);
	}
};

function otherMatcher(client) {
	var classMatches = false;
	knownClasses.forEach(function(kc) {
		if (kc.test(client.resourceClass)) {
			classMatches = true;
		}
	});
	var isNotPlasma = client.caption != "Plasma";
	var activityMatches = workspace.activities.length == 1 || client.activities.length == 0 || client.activities.indexOf(workspace.currentActivity) != -1;
	var desktopMatches = (client.onAllDesktops || client.desktop == workspace.currentDesktop);
	return !classMatches && isNotPlasma && activityMatches && desktopMatches;
}

function toggle(windowClassMatcher, launcher) {
	var cnds = new Array();
	workspace.clientList().forEach(function(client) {
		try {
			if (windowClassMatcher(client)) {
				cnds.push(client);
			}
		} catch (e) {
			print(e);
		}
	});
	print(cnds.length);

	if (cnds.length == 0) {
		launcher();
	} else {
		toggleOneOf(cnds);;
	}
}

function toggleOneOf(cnds) {
	if (cnds.length == 1) {
		if (workspace.activeClient != cnds[0]) {
			workspace.activeClient = cnds[0];
		} else {
			cnds[0].minimized = true;
		}
	} else {
		var toActivate = null;
		if (workspace.activeClient.resourceClass != cnds[1].resourceClass) {
			var toActivate = cnds[0];
			for (var c in cnds) {
				var cl = cnds[c];
				if (cl.activated > toActivate.activated) {
					toActivate = cl;
				}
			}
		} else {
			var toActivate = cnds[0];
			for (var c in cnds) {
				var cl = cnds[c];
				if (cl.activated < toActivate.activated) {
					toActivate = cl;
				}
			}
		}
		toActivate.activated = new Date().getTime();
		workspace.activeClient = toActivate;
	}
}

workspace.clientList().forEach(function(client) {
	client.activated = new Date().getTime();
});
workspace.clientAdded.connect(function(client) {
	client.activated = new Date().getTime();
});

apps.forEach(function(app) {
	print("Register " + app.shortcut);
	registerShortcut("Toggle " + app.shortcutName, "Toggle " + app.shortcutName, app.shortcut, function() {
		toggle(createWindowClassMatcher(app.classRegexp), createLauncher(app.launcherQuery));
	});
	registerShortcut("Run " + app.shortcutName, "Run " + app.shortcutName, "Shift+" + app.shortcut, function() {
		toggle(function(client) {return false;}, createLauncher(app.launcherQuery));
	});
});

registerShortcut("Toggle Other", "Toggle Other", "Meta+A", function() {
	try {
		toggle(otherMatcher, function() { return;});
	} catch (e) {
		print(e);
	}
});
