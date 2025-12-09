# Real-Time Messaging with FCM - Quick Integration Guide

## 🎯 What Was Created

### Backend Files
1. **`models/message.js`** - MongoDB schema for messages
2. **`models/conversation.js`** - MongoDB schema for conversations
3. **`services/messagingService.js`** - Messaging logic with FCM integration
4. **`routes/messaging.routes.js`** - All messaging API endpoints
5. **`MESSAGING_WITH_FCM_GUIDE.md`** - Complete documentation

### Flutter Files
1. **`lib/core/services/messaging_api_service.dart`** - API client for messaging
2. **`lib/firebase_msg.dart`** - Updated with message handling and routing

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Backend Integration

Add these routes to your **`app.js`** (right after other routes):

```javascript
// Import messaging routes
const messagingRoutes = require('./routes/messaging.routes');

// Register messaging routes
app.use('/api/messages', messagingRoutes);
```

That's it! All database models are auto-created by Mongoose.

---

### Step 2: Deploy Backend

```bash
cd /Users/mrmad/Dhruv/dhruvbackend

# Commit changes
git add .
git commit -m "Add real-time messaging with FCM notifications"

# Deploy to Vercel
vercel deploy
```

---

### Step 3: Test with Postman

Use the existing **`fcm-notifications.postman_collection.json`** and add these tests:

**Send Message:**
```bash
POST https://lovy-dusky.vercel.app/api/messages/send
Authorization: Bearer {{jwtToken}}
Content-Type: application/json

{
  "conversationId": "65abc123...",
  "receiverId": "65abc456...",
  "text": "Hello! This message will trigger FCM notification on receiver device!"
}
```

---

## 🔌 Integration Points

### When User Sends Message
```
User A: Types message + Taps Send
  ↓
Flutter: messagingService.sendMessage(...)
  ↓
Backend: POST /api/messages/send
  ↓
Backend: Creates Message
  ↓
Backend: Finds User B's FCM tokens
  ↓
Backend: Sends FCM to all User B's devices
  ↓
User B's Device: Receives FCM
  ↓
User B's Device: Displays notification "User A: Hello!"
```

### When User Receives Notification
```
Notification received by Firebase
  ↓
handleNotificationWithDisplay() called
  ↓
_displayNotification() shows visual notification
  ↓
User taps notification
  ↓
onDidReceiveNotificationResponse() triggered
  ↓
App navigates to chat screen with that conversation
```

---

## 💬 How to Use in Chat Screen

### 1. Send Message
```dart
class ChatScreen extends StatefulWidget {
  final String conversationId;
  final String receiverId;
  // ...
}

class _ChatScreenState extends State<ChatScreen> {
  final messagingService = MessagingApiService();
  final messageController = TextEditingController();

  Future<void> _sendMessage() async {
    if (messageController.text.isEmpty) return;

    try {
      await messagingService.sendMessage(
        conversationId: widget.conversationId,
        receiverId: widget.receiverId,
        text: messageController.text,
      );
      
      messageController.clear();
      // Refresh message list
      _loadMessages();
      
      print('✅ Message sent! FCM notification will arrive on receiver device.');
    } catch (e) {
      print('❌ Error: $e');
      // Show error snackbar
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Chat')),
      body: Column(
        children: [
          // Message list
          Expanded(child: _buildMessageList()),
          // Input field
          Container(
            padding: EdgeInsets.all(8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: messageController,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                SizedBox(width: 8),
                FloatingActionButton(
                  onPressed: _sendMessage,
                  child: Icon(Icons.send),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _loadMessages() async {
    try {
      final messages = await messagingService.getConversationMessages(
        conversationId: widget.conversationId,
      );
      setState(() {
        // Update your messages list
      });
    } catch (e) {
      print('❌ Error loading messages: $e');
    }
  }

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  @override
  void dispose() {
    messageController.dispose();
    super.dispose();
  }
}
```

### 2. Load Conversations List
```dart
class ConversationsScreen extends StatefulWidget {
  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  final messagingService = MessagingApiService();
  List<Map<String, dynamic>> conversations = [];

  Future<void> _loadConversations() async {
    try {
      final data = await messagingService.getConversations();
      setState(() {
        conversations = data;
      });
    } catch (e) {
      print('❌ Error: $e');
    }
  }

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: conversations.length,
      itemBuilder: (context, index) {
        final conv = conversations[index];
        final otherUser = conv['otherUser'];
        final lastMsg = conv['lastMessageText'];
        final unread = conv['unreadCount'] ?? 0;

        return ListTile(
          leading: CircleAvatar(
            backgroundImage: NetworkImage(otherUser['image'] ?? ''),
          ),
          title: Text('${otherUser['firstName']} ${otherUser['lastName']}'),
          subtitle: Text(lastMsg ?? 'No messages yet'),
          trailing: unread > 0
              ? Badge(label: Text('$unread'))
              : null,
          onTap: () {
            // Navigate to ChatScreen
            // ChatScreen(
            //   conversationId: conv['_id'],
            //   receiverId: otherUser['_id'],
            // )
          },
        );
      },
    );
  }
}
```

### 3. Start New Conversation
```dart
Future<void> _startConversationWithUser(String userId, String userName) async {
  try {
    final data = await messagingService.startConversation(recipientId: userId);
    final conversationId = data['conversationId'];
    
    // Navigate to ChatScreen
    // Navigator.push(
    //   context,
    //   MaterialPageRoute(
    //     builder: (context) => ChatScreen(
    //       conversationId: conversationId,
    //       receiverId: userId,
    //     ),
    //   ),
    // );
  } catch (e) {
    print('❌ Error: $e');
  }
}
```

---

## 🔄 Real-Time Updates (Optional Enhancement)

For real-time message updates without polling, consider adding:

### WebSocket Support (Future Enhancement)
```
1. Socket.IO server on backend
2. Join room: socket.join(conversationId)
3. Emit message: socket.emit('message_received', newMessage)
4. Update UI in real-time
```

### For Now: Polling
```dart
// Refresh messages every 2 seconds
Timer.periodic(Duration(seconds: 2), (_) {
  _loadMessages();
});
```

---

## 📤 FCM Notification Example

When User A sends message to User B:

**Backend sends FCM with:**
```json
{
  "notification": {
    "title": "John Doe",
    "body": "Hey! How's your day going?"
  },
  "data": {
    "conversationId": "65abc789...",
    "senderId": "65abc123...",
    "messageType": "text_message",
    "action": "open_chat"
  }
}
```

**User B's Device shows:**
```
┌─────────────────────────────────┐
│ 📱 NOTIFICATION                 │
│ John Doe                        │
│ Hey! How's your day going?      │
│                                 │
│ [DISMISS]         [OPEN]        │
└─────────────────────────────────┘
```

**If User B taps [OPEN]:**
- App routes to chat with John
- Conversation loads
- Messages displayed
- Marked as read

---

## ✅ Testing Checklist

- [ ] Backend routes registered in app.js
- [ ] Backend deployed to Vercel
- [ ] User A login on Device 1
- [ ] User B login on Device 2
- [ ] User A sends message to User B
- [ ] User B's Device 2 receives notification
- [ ] Notification displays with correct message
- [ ] User B taps notification
- [ ] App opens chat screen
- [ ] Message visible in chat
- [ ] User B can reply
- [ ] Reply notification arrives at Device 1

---

## 🐛 Debugging

**Check if message was sent:**
```bash
GET https://lovy-dusky.vercel.app/api/messages/conversations
Authorization: Bearer {{jwtToken}}
```

**Check if FCM tokens registered:**
```bash
GET https://lovy-dusky.vercel.app/api/notifications/tokens
Authorization: Bearer {{jwtToken}}
```

**Check backend logs:**
```bash
vercel logs   # View Vercel logs
# Look for:
# ✅ [MSG] Notification sent
# ❌ [MSG] Error
```

---

## 🎁 Bonus: Features Included

1. ✅ **Message Sending** - Send text, images, files
2. ✅ **FCM Notifications** - Automatic on every message
3. ✅ **Read Receipts** - Track message reading
4. ✅ **Soft Delete** - Delete messages locally
5. ✅ **Search** - Full-text search messages
6. ✅ **Conversation List** - Show all chats
7. ✅ **Unread Counts** - Track unread per conversation
8. ✅ **Multi-Device** - Send to all user's devices

---

## 📞 Support

If messages aren't arriving:
1. Check FCM token registered: `GET /notifications/tokens`
2. Check device notifications enabled
3. Check app has notification permissions
4. Review backend logs in Vercel
5. Check internet connection on receiving device

---

## 🚀 You're All Set!

The complete messaging system with FCM notifications is ready to use. Users will automatically receive notifications when messages arrive! 🎉
