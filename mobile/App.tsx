import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { ChildProvider } from "./src/child/ChildContext";
import RootNavigator from "./src/navigation";
import { Loader } from "./src/ui";

function Gate() {
  const { restoring } = useAuth();
  if (restoring) return <Loader />;
  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <ChildProvider>
          <NavigationContainer>
            <Gate />
          </NavigationContainer>
        </ChildProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
