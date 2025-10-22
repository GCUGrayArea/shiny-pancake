import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/screens/LoginScreen';
import SignUpScreen from '@/screens/SignUpScreen';
import ChatListScreen from '@/screens/ChatListScreen';
import NewChatScreen from '@/screens/NewChatScreen';
import ConversationScreen from '@/screens/ConversationScreen';
import CreateGroupScreen from '@/screens/CreateGroupScreen';
import GroupInfoScreen from '@/screens/GroupInfoScreen';
import LoadingScreen from '@/components/LoadingScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type MainStackParamList = {
  ChatList: undefined;
  NewChat: undefined;
  CreateGroup: {
    participants: {
      uid: string;
      email: string;
      displayName: string;
      isOnline?: boolean;
      lastSeen?: number;
    }[];
  };
  Conversation: {
    chatId?: string; // Optional - will be undefined for new chats
    otherUserId?: string; // For 1:1 chats
    otherUserName?: string; // For 1:1 chats
    otherUserEmail?: string; // For 1:1 chats
    isGroup?: boolean; // For group chats
    groupName?: string; // For group chats
  };
  GroupInfo: {
    chatId: string;
    chatName: string;
  };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Create Account' }} />
    </AuthStack.Navigator>
  );
}

function MainStackNavigator() {
  console.log('📋 MainStackNavigator: Rendering main stack');
  return (
    <MainStack.Navigator>
      <MainStack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: 'Chats' }}
      />
      <MainStack.Screen
        name="NewChat"
        component={NewChatScreen}
        options={{ title: 'New Chat' }}
      />
      <MainStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ title: 'Create Group' }}
      />
      <MainStack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{ title: 'Chat' }}
      />
      <MainStack.Screen
        name="GroupInfo"
        component={GroupInfoScreen}
        options={{ title: 'Group Info' }}
      />
    </MainStack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  console.log('🧭 AppNavigator: Rendering', { user: user?.uid, loading, hasUser: !!user });

  if (loading) {
    console.log('⏳ AppNavigator: Showing loading screen');
    return <LoadingScreen message="Initializing…" />;
  }

  if (user) {
    console.log('📱 AppNavigator: User authenticated, showing main navigator');
  } else {
    console.log('📱 AppNavigator: No user, showing auth navigator');
  }

  return (
    <NavigationContainer>
      {user ? <MainStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}


