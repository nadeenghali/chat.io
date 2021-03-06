"use strict";

//var CryptoJS = require("crypto-js");

var app = {
  rooms: function() {
    var socket = io("/rooms", { transports: ["websocket"] });
    // var p2p = new P2P(socket);

    // When socket connects, get a list of chatrooms
    socket.on("connect", function() {
      // Update rooms list upon emitting updateRoomsList event
      socket.on("updateRoomsList", function(room) {
        // Display an error message upon a user error(i.e. creating a room with an existing title)
        $(".room-create p.message").remove();
        if (room.error != null) {
          $(".room-create").append(
            `<p class="message error">${room.error}</p>`
          );
        } else {
          app.helpers.updateRoomsList(room);
        }
      });

      // Whenever the user hits the create button, emit createRoom event.
      $(".room-create button").on("click", function(e) {
        var inputEle = $("input[name='title']");
        var roomTitle = inputEle.val().trim();
        if (roomTitle !== "") {
          socket.emit("createRoom", roomTitle);
          inputEle.val("");
        }
      });
    });
  },

  chat: function(roomId, username) {
    var socket = io("/chatroom", { transports: ["websocket"] });
    // var socket = new P2P(socket);
    //import CryptoJS from "crypto-js");
    let image = null;

    // When socket connects, join the current chatroom
    socket.on("connect", function() {
      socket.usePeerConnection = true;
      socket.emit("join", roomId);

      // Update users list upon emitting updateUsersList event
      socket.on("updateUsersList", function(users, clear) {
        $(".container p.message").remove();
        if (users.error != null) {
          $(".container").html(`<p class="message error">${users.error}</p>`);
        } else {
          app.helpers.updateUsersList(users, clear);
        }
      });

      var inputFile = $("input[name='input']");
      document
        .getElementById("input")
        .addEventListener("change", function(event) {
          // Prepeare file reader
          var file = event.target.files[0];
          var fileReader = new FileReader();
          console.log(image);

          fileReader.onloadend = function(event) {
            // Send an image event to the socket
            image = event.target.result;
            console.log(image);
            output.src = image;
          };
          console.log(image);
          // Read file
          fileReader.readAsDataURL(file);
          $("input[name='input']").val("");
          $("#output").attr("src"," ");
        });
      // Whenever the user hits the save button, emit newMessage event.
      $(".chat-message button").on("click", function(e) {
        var textareaEle = $("textarea[name='message']");
        var messageContent = textareaEle.val().trim();
        console.log(
          "message content",
          CryptoJS.AES.encrypt(
            messageContent,
            "extra layer of protection nbsmiaaardvraleaeyn2"
          ).toString()
        );
        if (messageContent !== "") {
          //encrypt the text message content as an extra layer of protection
          var message = {
            content: CryptoJS.AES.encrypt(
              messageContent,
              "extra layer of protection nbsmiaaardvraleaeyn2"
            ).toString(),
            username: username,
            date: Date.now(),
            type: "txt"
          };
          console.log("unencrypted messge", message);
          console.log(
            "encrypted messge",
            CryptoJS.AES.encrypt(
              JSON.stringify(message),
              "first layer of protection nbsmiaaardvraleaeyn"
            ).toString()
          );

          socket.emit(
            "newMessage",
            roomId,
            ////encrypt the wholde message object including the username and date
            //and type and content
            CryptoJS.AES.encrypt(
              JSON.stringify(message),
              "first layer of protection nbsmiaaardvraleaeyn"
            ).toString()
          );
          textareaEle.val("");
          app.helpers.addMessage(
            //encrypt the wholde message object including the username and date
            //and type and content
            CryptoJS.AES.encrypt(
              JSON.stringify(message),
              "first layer of protection nbsmiaaardvraleaeyn"
            ).toString()
          );
        }
        console.log("image", image);

        if (image != null) {
          //encrypt the file message content as an extra layer of protection
          var message = {
            content: CryptoJS.AES.encrypt(
              JSON.stringify(image),
              "extra layer of protection nbsmiaaardvraleaeyn2"
            ).toString(),
            username: username,
            date: Date.now(),
            type: "file"
          };

          console.log("sending img");
          socket.emit(
            "newMessage",
            roomId,
            //encrypt the wholde message object including the username and date
            //and type and content
            CryptoJS.AES.encrypt(
              JSON.stringify(message),
              "first layer of protection nbsmiaaardvraleaeyn"
            ).toString()
          );
          image = null;
          app.helpers.addMessage(
            //encrypt the wholde message object including the username and date
            //and type and content
            CryptoJS.AES.encrypt(
              JSON.stringify(message),
              "first layer of protection nbsmiaaardvraleaeyn"
            ).toString()
          );
        }
      });

      // Whenever a user leaves the current room, remove the user from users list
      socket.on("removeUser", function(userId) {
        $("li#user-" + userId).remove();
        app.helpers.updateNumOfUsers();
      });

      // Append a new message
      socket.on("addMessage", function(message) {
        console.log("message", message);
        app.helpers.addMessage(message);
      });
    });
  },

  helpers: {
    encodeHTML: function(str) {
      return $("<div />")
        .text(str)
        .html();
    },

    // Update rooms list
    updateRoomsList: function(room) {
      room.title = this.encodeHTML(room.title);
      room.title =
        room.title.length > 25 ? room.title.substr(0, 25) + "..." : room.title;
      var html = `<a href="/chat/${room._id}"><li class="room-item">${
        room.title
      }</li></a>`;

      if (html === "") {
        return;
      }

      if ($(".room-list ul li").length > 0) {
        $(".room-list ul").prepend(html);
      } else {
        $(".room-list ul")
          .html("")
          .html(html);
      }

      this.updateNumOfRooms();
    },

    // Update users list
    updateUsersList: function(users, clear) {
      if (users.constructor !== Array) {
        users = [users];
      }

      var html = "";
      for (var user of users) {
        user.username = this.encodeHTML(user.username);
        html += `<li class="clearfix" id="user-${user._id}">
                     <img src="${user.picture}" alt="${user.username}" />
                     <div class="about">
                        <div class="name">${user.username}</div>
                        <div class="status"><i class="fa fa-circle online"></i> online</div>
                     </div></li>`;
      }

      if (html === "") {
        return;
      }

      if (clear != null && clear == true) {
        $(".users-list ul")
          .html("")
          .html(html);
      } else {
        $(".users-list ul").prepend(html);
      }

      this.updateNumOfUsers();
    },

    // Adding a new message to chat history
    addMessage: function(message) {
      //var CryptoJS = require("crypto-js");
      //decrypt message
      message = JSON.parse(
        CryptoJS.AES.decrypt(
          message,
          "first layer of protection nbsmiaaardvraleaeyn"
        ).toString(CryptoJS.enc.Utf8)
      );

      message.date = new Date(message.date).toLocaleString();
      message.username = this.encodeHTML(message.username);

      var html = "";
      console.log(message.type);
      console.log(message.content);

      if (message.type === "txt") {
        message.content = this.encodeHTML(
          CryptoJS.AES.decrypt(
            message.content,
            "extra layer of protection nbsmiaaardvraleaeyn2"
          ).toString(CryptoJS.enc.Utf8)
        );
        console.log(message.content);
        html = `<li>
                    <div class="message-data">
                      <span class="message-data-name">${message.username}</span>
                      <span class="message-data-time">${message.date}</span>
                    </div>
                    <div class="message my-message" dir="auto">${
                      message.content
                    }</div>
                  </li>`;
      }
      if (message.type === "file") {
        console.log("message content", message.content);
        message.content = this.encodeHTML(
          JSON.parse(
            CryptoJS.AES.decrypt(
              message.content,
              "extra layer of protection nbsmiaaardvraleaeyn2"
            ).toString(CryptoJS.enc.Utf8)
          )
        );
        console.log("message content", message.content);

        output.src = message.content;
        html = `<li>
                    <div class="message-data">
                      <span class="message-data-name">${message.username}</span>
                      <span class="message-data-time">${message.date}</span>
                    </div>
                    <div class="message my-message" dir="auto">
                      <img style = 'width: 300px' src= ${
                        message.content
                      } id = "output"/>
                    </div>
                  </li>`;
      }
      console.log(html);
      $(html)
        .hide()
        .appendTo(".chat-history ul")
        .slideDown(200);

      // Keep scroll bar down
      $(".chat-history").animate(
        { scrollTop: $(".chat-history")[0].scrollHeight },
        1000
      );
    },

    // Update number of rooms
    // This method MUST be called after adding a new room
    updateNumOfRooms: function() {
      var num = $(".room-list ul li").length;
      $(".room-num-rooms").text(num + " Room(s)");
    },

    // Update number of online users in the current room
    // This method MUST be called after adding, or removing list element(s)
    updateNumOfUsers: function() {
      var num = $(".users-list ul li").length;
      $(".chat-num-users").text(num + " User(s)");
    }
  }
};
