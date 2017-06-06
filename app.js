jQuery.fn.extend({
    getMaxZ: function () {
        return Math.max.apply(null, jQuery(this).map(function () {
            var z;
            return isNaN(z = parseInt(jQuery(this).css("z-index"), 10)) ? 0 : z;
        }));
    }
});
$(function () {
    var config = {
        apiKey: "AIzaSyAc2KCxhpaSLVOq62wGmDfNSY3HM4Diz-Y",
        authDomain: "task-manager-4c4cb.firebaseapp.com",
        databaseURL: "https://task-manager-4c4cb.firebaseio.com",
        projectId: "task-manager-4c4cb",
        storageBucket: "task-manager-4c4cb.appspot.com",
        messagingSenderId: "941300087012"
    };
    firebase.initializeApp(config);

    var firebaseref = new firebase.database().ref();
    var listRef = null;
    var userData = null;
    var timer = null;

    $(".status").removeClass('hide').hide();

    goToTab = function (tabname) {
        if (tabname == "#lists") {
            if (userData === null) tabname = "#login";
        }
        $(".nav.navbar-nav > li > a").parent().removeClass('active');
        $(".nav.navbar-nav > li > a[data-target='" + tabname + "']").parent().addClass('active');
        $(".tab").addClass('hide');
        $(".tab" + tabname).removeClass('hide');
    }


    var bindEventsToItems = function ($listItem) {
        $listItem.draggable({
            containment: "#sharedlist",
            start: function () {
                var topzindex = $("#sharedlist li").getMaxZ() + 1;
                $(this).css('z-index', topzindex);
            },
            stop: function () {
                addCSSStringToItem($(this).attr('data-item-id'), $(this).attr('style'));
            }

        }).css('position', 'absolute');

        $listItem.find(".removebtn").on('click', function () {
            removeItemFromFirebase($(this).closest("[data-item-id]").attr('data-item-id'));
        });

        $listItem.find(".editebtn").on('click', function () {
           var $content = $("#listitem");
           var content = $content.val();
            $("#listitem").val('');
            editeItemInFirebase($(this).closest("[data-item-id]").attr('data-item-id'), content);
        });
    }

    function randomIntFromInterval(min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	function getRandomRolor() {
		var letters = '0123456789'.split('');
		var color = '#';
		for (var i = 0; i < 6; i++) {
			var random = Math.round(Math.random() * 10);
			if (random == 10) random = 9;
			color += letters[random];
		}
		return color;
	}

    var buildNewListItem = function (listItem, key) {
        var author = listItem.author;
        var content = listItem.content;
        var timestamp = listItem.timestamp;
        var id = key;
        var css = listItem.css;
        var $newListItem = $("<li data-item-id='" + id + "'></li>").html("<p class='itemauthor'>Added By - " + author +
             "<span class='editebtn'><i class='fa fa-pencil'></i></span> "+
            "<span class='removebtn'><i class='fa fa-remove'></i></span> " +
            "</span></p><p class='itemtext'>" + content + "</p>");
        $newListItem.prependTo($("#sharedlist"));
        $newListItem.attr('style', css);
        bindEventsToItems($newListItem);
    }

    var updateListItem = function (listItem, key) {
        var author = listItem.author;
        var content = listItem.content;
        var timestamp = listItem.timestamp;
        var id = key;
        var css = listItem.css;
        $("#lists [data-item-id='" + id + "']").attr('itemtext', content);
        $("#lists [data-item-id='" + id + "']").attr('style', css);
    }

    var removeListItem = function (key) {
        $("#lists [data-item-id='" + key + "']").remove();
    }

    var editeListItem = function (listItem, key, content_c) {
        
        listItem.content = content_c;
    }


    var childAddedFunction = function (snapshot) {
        var key = snapshot.key;
        var listItem = snapshot.val();
        buildNewListItem(listItem, key);
        $("#lists .status").fadeIn(400).html('New item added!')
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
            $("#lists .status").fadeOut(400);
        }, 2500);
    }

    var childChangedFunction = function (snapshot) {
        var listItem = snapshot.val();
        var key = snapshot.key;
        console.log("Key - " + key + " has been changed");
        console.log(listItem);
        updateListItem(listItem, key);
    }

    var childRemovedFunction = function (snapshot) {
        var key = snapshot.key;
        removeListItem(key)
        console.log('Child Removed');
    }

    var setUpFirebaseEvents = function () {
        listRef = firebase.database().ref('lists/sharedlist/items');
        $("#sharedlist").html('');
        listRef.off('child_added', childAddedFunction)
        listRef.on("child_added", childAddedFunction);

        listRef.off('child_changed', childChangedFunction);
        listRef.on('child_changed', childChangedFunction);

        listRef.off('child_removed', childRemovedFunction);
        listRef.on('child_removed', childRemovedFunction);
    }

    
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            console.log("User " + user.uid + " is logged in");
            userData = user;
            console.log(userData);
            loadProfile();
            setUpFirebaseEvents();
        }
        else {
            console.log("User is logged out");
            $(".status").html('You are not logged in!').show();
            userData = null;
            listRef = null;
        }
    });

    var loadProfile = function () {
        userRef = firebaseref.child('users').child(userData.uid);
        userRef.once('value', function (snap) {
            var temp = snap.val();
            if (!temp) {
                return;
            }
            var user = firebase.auth().currentUser;
            user.updateProfile({
            displayName: temp.full_name
              }).then(function() {
             // Update successful.
            }, function(error) {
            // An error happened.
});
            goToTab("#lists");
        });
    }
    
    $("#addItemToList").on('click', function () {
        var $content = $("#listitem");
        var content = $content.val();
        if (content === "") {
            $("#lists .status").html('Please enter the text for the new item!').fadeIn(400);
            return;
        }
        $("#listitem").val('');
        addListItem(content);
    });

    $("#sort-items").on('click', function () {
        var leftcounter = 0;
        var topcounter = 0;
        var topPos = 0;
        var e_topPos = 0;
        var e_leftPos = 0;
        $("#sharedlist li").each(function (index) {
            topPos = $(this).outerHeight(true) > topPos ? $(this).outerHeight(true) : topPos;
            if (!leftcounter) {
                e_topPos = topcounter * topPos + 10;
                topcounter++;
            }
            e_leftPos = leftcounter * 33;
            leftcounter++;
            leftcounter = leftcounter % 3;
            var staticPosCSSString = $(this).clone().css({
                position: 'absolute',
                top: e_topPos + "px",
                left: e_leftPos + "%",
            }).attr('style');
            var key = $(this).attr('data-item-id');
            addCSSStringToItem(key, staticPosCSSString);
        });
    });

    $(".nav.navbar-nav > li > a").on('click', function (e) {
        var id = $(this).attr('id');
        if (id == "logout") {
            return;
        }

        e.preventDefault();
        $(this).parent().addClass('active');
        //force if logged in
        if (userData !== null) {
            goToTab('#lists');
            return;
        } else {
            goToTab($(this).attr('data-target'));
        }
    });


    $("#logout").on('click', function () {
        firebase.auth().signOut();
        userData = null;
        $(".welcome").html('');
        goToTab('#login');
    });


   

    var signupLoginCallback = function (error, authData) {
        if (error) {
            console.log("Login Failed!", error);
        } else {
            console.log("Authenticated successfully with payload:", authData);
            addUserName(userData.uid);
            goToTab("#lists");
        }
    }

    var loginUser = function (email, password) {
      firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
            console.log(error);
        });
    }

    $("#login-btn").on('click', function () {
        var email = $("#login-email").val();
        var password = $("#login-password").val();
        loginUser(email, password);
    });

    $("#signup-btn").on('click', function () {

        var email = $("#email").val();
        var password = $("#password").val();
       firebase.auth().createUserWithEmailAndPassword(email, password).then(function(authData) {
           firebase.auth().onAuthStateChanged(function (user) {
             if (user) {
            addUserName(user.uid);
             goToTab("#lists");
            console.log("User " + user.uid + " is logged in");
            userData = user;
            console.log(userData);
            loadProfile();
            setUpFirebaseEvents();
        }
        else {
            console.log("User is logged out");
            $(".status").html('You are not logged in!').show();
            userData = null;
            listRef = null;
        }
    });
       }).catch(function(error) {
             console.log("Error creating user:", error);
                    $("#signup-btn").parents("#register").find('.status').html("Error creating user:" + error).show();
        });

           
    });


    var addListItem = function (content) {
        var postsRef = listRef;
        var x = Date();
        var random = randomIntFromInterval(1, 400);
        var randomColor = getRandomRolor();
        var topzindex = $("#sharedlist li").getMaxZ() + 1;
        $temp = $("<li></li>");
        $temp.css({
            'position': 'absolute',
            'top': random + 'px',
            'left': random / 2 + 'px',
            'background': randomColor,
            'z-index': topzindex
        });
        var css = $temp.attr('style');
        try {
            var newItemRef = postsRef.push({
                author: userData.displayName,
                content: content,
                css: css
            });
        } catch (e) {
            $("#lists").find(".status").html(e);
        }
    }


    var removeItemFromFirebase = function (key) {
        var itemRef = firebase.database().ref('lists/sharedlist/items/' + key);
        itemRef.remove();
    }

    var editeItemInFirebase = function (key, content){
        var itemRef = firebase.database().ref('lists/sharedlist/items/' + key);
        itemRef.update({
            content: content,
        });
    }


    var addCSSStringToItem = function (key, css) {
        var itemRef = firebase.database().ref('lists/sharedlist/items/' + key);
        itemRef.update({
            css: css,
        });
    }

    var addUserName = function (userid) {
        var name = $("#name").val();
        if (!name) name = userid;
        var userRef = firebase.database().ref('users/' + userid);
        userRef.set({
            full_name: name
            
        },

            function (error) {
                if (error) {
                    console.log("Error adding user data:", error);
                    $("#signup-btn").parent().find('.status').html("Error adding user data:" + error).show();
                } else {
                    console.log("Successfully added user data for");
                    $(".nav.navbar-nav > li > a[data-target='#login']").click();
                }
            });
    }


});