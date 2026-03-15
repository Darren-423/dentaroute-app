import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, FlatList, Image, KeyboardAvoidingView, Modal, Platform,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from "react-native";
import { ChatMessage, store } from "../../lib/store";

const T = {
  teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#ffffff",
};

export default function PatientChatScreen() {
  const { chatRoomId, dentistName, clinicName } = useLocalSearchParams<{
    chatRoomId: string; dentistName: string; clinicName: string;
  }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Translation state
  const [translateOn, setTranslateOn] = useState(true);
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const translatingRef = useRef(false);

  // Typing indicator
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showAttachModal, setShowAttachModal] = useState(false);

  // Typing dots animation
  const dotAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (otherTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      dotAnim.setValue(0);
    }
  }, [otherTyping]);

  useEffect(() => {
    if (chatRoomId) {
      loadMessages();
      store.markAsRead(chatRoomId, "patient");
    }
  }, [chatRoomId]);

  // Poll for new messages + typing status every 2s
  useEffect(() => {
    const interval = setInterval(async () => {
      await loadMessages();
      if (chatRoomId) {
        const typing = await store.getTyping(chatRoomId, "doctor");
        setOtherTyping(typing);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [chatRoomId]);

  const loadMessages = async () => {
    if (!chatRoomId) return;
    const msgs = await store.getMessages(chatRoomId);
    setMessages(msgs);
    store.markAsRead(chatRoomId, "patient");
  };

  // Auto-translate untranslated messages (batch: parallel API calls, single storage write)
  const translatePending = useCallback(async (msgs: ChatMessage[]) => {
    if (!translateOn || !chatRoomId || translatingRef.current) return;
    const needTranslation = msgs.filter((m) => !m.translatedText && !failedIds.has(m.id) && m.text);
    if (needTranslation.length === 0) return;

    translatingRef.current = true;
    const ids = needTranslation.map((m) => m.id);
    setTranslatingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

    // Batch translate — parallel API calls, single atomic storage write
    const results = await store.translateMessages(chatRoomId, ids);

    const newFailed = new Set<string>();
    for (const id of ids) {
      if (results[id] === null || results[id] === undefined) {
        newFailed.add(id);
      }
    }

    setTranslatingIds(new Set());
    if (newFailed.size > 0) {
      setFailedIds((prev) => {
        const next = new Set(prev);
        newFailed.forEach((id) => next.add(id));
        return next;
      });
    }

    // Reload messages to pick up cached translations
    const updated = await store.getMessages(chatRoomId);
    setMessages(updated);
    translatingRef.current = false;
  }, [translateOn, chatRoomId, failedIds]);

  // Trigger translation when messages change or toggle turns on
  useEffect(() => {
    if (translateOn && messages.length > 0) {
      translatePending(messages);
    }
  }, [translateOn, messages.length]);

  const retryTranslation = async (msg: ChatMessage) => {
    if (!chatRoomId || translatingRef.current) return;
    setFailedIds((prev) => {
      const next = new Set(prev);
      next.delete(msg.id);
      return next;
    });
    setTranslatingIds((prev) => new Set(prev).add(msg.id));
    translatingRef.current = true;
    const results = await store.translateMessages(chatRoomId, [msg.id]);
    setTranslatingIds((prev) => {
      const next = new Set(prev);
      next.delete(msg.id);
      return next;
    });
    if (!results[msg.id]) {
      setFailedIds((prev) => new Set(prev).add(msg.id));
    }
    const updated = await store.getMessages(chatRoomId);
    setMessages(updated);
    translatingRef.current = false;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !chatRoomId) return;
    setInput("");
    if (chatRoomId) store.setTyping(chatRoomId, "patient", false);
    await store.sendMessage(chatRoomId, "patient", text);
    await loadMessages();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    if (chatRoomId && text.trim()) {
      store.setTyping(chatRoomId, "patient", true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        store.setTyping(chatRoomId, "patient", false);
      }, 3000);
    }
  };

  const handlePickImage = async (useCamera: boolean) => {
    setShowAttachModal(false);
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    if (!chatRoomId) return;
    await store.sendMessage(chatRoomId, "patient", "📷 Photo", { imageUri: uri });
    await loadMessages();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.sender === "patient";
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDateHeader = !prevMsg ||
      new Date(item.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

    return (
      <>
        {showDateHeader && (
          <View style={s.dateHeader}>
            <Text style={s.dateHeaderText}>
              {new Date(item.timestamp).toLocaleDateString(undefined, {
                weekday: "short", month: "short", day: "numeric",
              })}
            </Text>
          </View>
        )}
        <View style={[s.msgRow, isMe && s.msgRowMe]}>
          {!isMe && (
            <View style={s.msgAvatar}>
              <Text style={s.msgAvatarText}>
                {(dentistName || "D").split(" ").pop()?.[0] || "D"}
              </Text>
            </View>
          )}
          <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
            {/* Image message */}
            {item.messageType === "image" && item.imageUri ? (
              <TouchableOpacity onPress={() => setPreviewImage(item.imageUri!)}>
                <Image source={{ uri: item.imageUri }} style={s.msgImage} />
              </TouchableOpacity>
            ) : (
              /* Original text */
              <Text style={[s.bubbleText, isMe ? s.bubbleTextMe : s.bubbleTextThem]}>
                {item.text}
              </Text>
            )}

            {/* Translation (only when toggle is ON and text message) */}
            {translateOn && item.messageType !== "image" && (
              <>
                {translatingIds.has(item.id) ? (
                  <View style={s.translatingRow}>
                    <ActivityIndicator size="small" color={isMe ? "rgba(255,255,255,0.6)" : T.slate} />
                    <Text style={[s.translatingText, isMe && { color: "rgba(255,255,255,0.5)" }]}>
                      Translating...
                    </Text>
                  </View>
                ) : failedIds.has(item.id) ? (
                  <TouchableOpacity onPress={() => retryTranslation(item)}>
                    <Text style={s.translationFailed}>Translation failed — tap to retry</Text>
                  </TouchableOpacity>
                ) : item.translatedText ? (
                  <>
                    <View style={[s.transDivider, isMe && { backgroundColor: "rgba(255,255,255,0.2)" }]} />
                    <Text style={[s.transText, isMe ? s.transTextMe : s.transTextThem]}>
                      {item.translatedText}
                    </Text>
                  </>
                ) : null}
              </>
            )}

            <View style={s.timeRow}>
              <Text style={[s.timeText, isMe ? s.timeTextMe : s.timeTextThem]}>
                {formatTime(item.timestamp)}
              </Text>
              {isMe && (
                <Text style={[s.readReceipt, item.readAt ? s.readReceiptRead : s.readReceiptSent]}>
                  {item.readAt ? "✓✓" : "✓"}
                </Text>
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <View style={s.headerAvatar}>
            <Text style={s.headerAvatarText}>
              {(dentistName || "D").split(" ").pop()?.[0] || "D"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerName} numberOfLines={1}>{dentistName || "Doctor"}</Text>
            <Text style={s.headerClinic} numberOfLines={1}>{clinicName || "Clinic"}</Text>
          </View>
        </View>
        {/* Translation Toggle */}
        <TouchableOpacity
          onPress={() => setTranslateOn(!translateOn)}
          style={[s.translateToggle, translateOn && s.translateToggleOn]}
        >
          <Text style={[s.translateToggleText, translateOn && s.translateToggleTextOn]}>
            {translateOn ? "Translate ON" : "Translate OFF"}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={s.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={s.emptyChat}>
            <Text style={s.emptyChatIcon}>👋</Text>
            <Text style={s.emptyChatText}>
              Say hello to {dentistName || "the doctor"}!
            </Text>
            <Text style={s.emptyChatSub}>
              Ask about treatments, pricing, or your visit
            </Text>
          </View>
        }
      />

      {/* Quick Reply Chips (show when empty) */}
      {messages.length === 0 && (
        <View style={s.quickReplies}>
          {[
            "Hello! I have a question about the treatment plan.",
            "How long will the treatment take?",
            "Do you offer airport pickup service?",
          ].map((q) => (
            <TouchableOpacity
              key={q}
              style={s.quickChip}
              onPress={async () => {
                if (!chatRoomId) return;
                await store.sendMessage(chatRoomId, "patient", q);
                await loadMessages();
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
              }}
            >
              <Text style={s.quickChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Typing indicator */}
      {otherTyping && (
        <View style={s.typingBar}>
          <View style={s.typingAvatar}>
            <Text style={s.typingAvatarText}>{(dentistName || "D").split(" ").pop()?.[0] || "D"}</Text>
          </View>
          <Animated.View style={[s.typingBubble, { opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]}>
            <Text style={s.typingDots}>...</Text>
          </Animated.View>
        </View>
      )}

      {/* Input Bar */}
      <View style={s.inputBar}>
        <TouchableOpacity style={s.attachBtn} onPress={() => setShowAttachModal(true)}>
          <Text style={s.attachBtnText}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={s.textInput}
          placeholder="Type a message..."
          placeholderTextColor={T.slateLight}
          value={input}
          onChangeText={handleInputChange}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim()}
          activeOpacity={0.7}
        >
          <Text style={s.sendBtnText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Attach Modal */}
      {showAttachModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowAttachModal(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAttachModal(false)}>
            <View style={s.attachSheet}>
              <TouchableOpacity style={s.attachOption} onPress={() => handlePickImage(true)}>
                <Text style={s.attachOptionIcon}>📷</Text>
                <Text style={s.attachOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.attachOption} onPress={() => handlePickImage(false)}>
                <Text style={s.attachOptionIcon}>🖼</Text>
                <Text style={s.attachOptionText}>Photo Library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.attachOption, s.attachCancel]} onPress={() => setShowAttachModal(false)}>
                <Text style={s.attachCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
          <View style={s.imagePreviewOverlay}>
            <TouchableOpacity style={s.imagePreviewClose} onPress={() => setPreviewImage(null)}>
              <Text style={s.imagePreviewCloseText}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: previewImage }} style={s.imagePreviewImg} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 14,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center",
  },
  headerAvatarText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  headerName: { fontSize: 15, fontWeight: "700", color: "#fff" },
  headerClinic: { fontSize: 11, color: "rgba(255,255,255,0.55)" },

  // Translation toggle
  translateToggle: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.08)",
  },
  translateToggleOn: {
    backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.4)",
  },
  translateToggleText: {
    fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.5)",
  },
  translateToggleTextOn: {
    color: "#fff",
  },

  // Messages
  messageList: { padding: 16, paddingBottom: 8, flexGrow: 1 },

  dateHeader: { alignItems: "center", marginVertical: 12 },
  dateHeaderText: {
    fontSize: 11, color: T.slateLight, fontWeight: "600",
    backgroundColor: T.white, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 10, overflow: "hidden",
  },

  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 8, gap: 8 },
  msgRowMe: { flexDirection: "row-reverse" },

  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: T.tealLight, alignItems: "center", justifyContent: "center",
  },
  msgAvatarText: { fontSize: 11, fontWeight: "700", color: T.teal },

  bubble: {
    maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: T.teal, borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: T.white, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: T.border,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: T.white },
  bubbleTextThem: { color: T.navy },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 },
  timeText: { fontSize: 10 },
  timeTextMe: { color: "rgba(255,255,255,0.6)" },
  timeTextThem: { color: T.slateLight },
  readReceipt: { fontSize: 11, fontWeight: "700" },
  readReceiptSent: { color: "rgba(255,255,255,0.5)" },
  readReceiptRead: { color: "#60a5fa" },
  msgImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },

  // Translation bubble additions
  translatingRow: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6,
  },
  translatingText: {
    fontSize: 12, color: T.slate, fontStyle: "italic",
  },
  transDivider: {
    height: 1, backgroundColor: "rgba(0,0,0,0.08)", marginVertical: 6,
  },
  transText: {
    fontSize: 13, lineHeight: 18,
  },
  transTextMe: {
    color: "rgba(255,255,255,0.7)",
  },
  transTextThem: {
    color: T.slate,
  },
  translationFailed: {
    fontSize: 12, color: "#ef4444", marginTop: 4,
  },

  // Empty
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyChatIcon: { fontSize: 48, marginBottom: 12 },
  emptyChatText: { fontSize: 16, fontWeight: "600", color: T.navy, marginBottom: 4 },
  emptyChatSub: { fontSize: 13, color: T.slateLight, textAlign: "center" },

  // Quick replies
  quickReplies: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  quickChip: {
    backgroundColor: T.white, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: T.tealMid,
  },
  quickChipText: { fontSize: 13, color: T.teal },

  // Typing indicator
  typingBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  typingAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: T.tealLight, alignItems: "center", justifyContent: "center" },
  typingAvatarText: { fontSize: 9, fontWeight: "700", color: T.teal },
  typingBubble: { backgroundColor: T.white, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: T.border },
  typingDots: { fontSize: 20, color: T.slate, letterSpacing: 2 },

  // Attach
  attachBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, alignItems: "center", justifyContent: "center" },
  attachBtnText: { fontSize: 18 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  attachSheet: { backgroundColor: T.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, gap: 8 },
  attachOption: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, backgroundColor: T.bg },
  attachOptionIcon: { fontSize: 22 },
  attachOptionText: { fontSize: 15, fontWeight: "600", color: T.navy },
  attachCancel: { backgroundColor: "transparent", justifyContent: "center" },
  attachCancelText: { fontSize: 15, fontWeight: "600", color: T.slate, textAlign: "center" },

  imagePreviewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  imagePreviewClose: { position: "absolute", top: 56, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  imagePreviewCloseText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  imagePreviewImg: { width: "90%", height: "70%" },

  // Input
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 56,
    backgroundColor: T.white, borderTopWidth: 1, borderTopColor: T.border,
  },
  textInput: {
    flex: 1, backgroundColor: T.bg, borderRadius: 22, paddingHorizontal: 18,
    paddingVertical: 10, fontSize: 14, color: T.navy, maxHeight: 100,
    borderWidth: 1, borderColor: T.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: T.teal, alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: T.white, fontSize: 20, fontWeight: "600" },
});
