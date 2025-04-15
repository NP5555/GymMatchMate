import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "./use-toast";

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

export function useWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  const connect = useCallback(() => {
    if (!user || isConnecting || isConnected || socketRef.current) {
      return;
    }
    
    try {
      setIsConnecting(true);
      
      // Create WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        console.log("WebSocket connection established");
      };
      
      socket.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        socketRef.current = null;
        
        console.log(`WebSocket connection closed: ${event.reason || "Unknown reason"}`);
        
        // Try to reconnect after a delay, but only if the user is still logged in
        if (user) {
          setTimeout(() => {
            connect();
          }, 5000);
        }
      };
      
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to messaging service. Please try again.",
          variant: "destructive",
        });
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
      
      socketRef.current = socket;
    } catch (error) {
      setIsConnecting(false);
      console.error("WebSocket connection error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to messaging service. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, isConnecting, isConnected, toast]);
  
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);
  
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Not connected to messaging service. Please try again.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Message Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);
  
  // Handle different types of incoming messages
  const handleMessage = useCallback((data: WebSocketMessage) => {
    switch (data.type) {
      case "new_message":
        // A new message received
        // Invalidate cache to refresh the messages
        queryClient.invalidateQueries({
          queryKey: ["/api/messages", data.message.senderId]
        });
        
        // Invalidate unread count
        queryClient.invalidateQueries({
          queryKey: ["/api/messages/unread/count"]
        });
        
        // Show notification if user is not in the chat
        const currentPath = window.location.pathname;
        if (!currentPath.includes(`/messages/${data.message.senderId}`)) {
          toast({
            title: "New Message",
            description: "You have received a new message",
          });
        }
        break;
        
      case "message_sent":
        // Confirmation that a message was sent
        // Invalidate cache to refresh the messages
        queryClient.invalidateQueries({
          queryKey: ["/api/messages", data.message.receiverId]
        });
        break;
        
      case "messages_read":
        // Confirmation that messages were marked as read
        break;
        
      case "error":
        // Error from the server
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
        break;
        
      default:
        console.log("Unknown message type:", data.type);
    }
  }, [toast]);
  
  // Connect to WebSocket when user logs in
  useEffect(() => {
    if (user && !isConnected && !isConnecting && !socketRef.current) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [user, isConnected, isConnecting, connect, disconnect]);
  
  // Send a message to another user
  const sendChatMessage = useCallback((receiverId: number, content: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to send messages",
        variant: "destructive",
      });
      return false;
    }
    
    return sendMessage({
      type: "send_message",
      senderId: user.id,
      receiverId,
      content,
    });
  }, [user, sendMessage, toast]);
  
  // Mark messages from a user as read
  const markMessagesAsRead = useCallback((senderId: number) => {
    if (!user) {
      return false;
    }
    
    return sendMessage({
      type: "read_messages",
      senderId,
    });
  }, [user, sendMessage]);
  
  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendChatMessage,
    markMessagesAsRead,
  };
}