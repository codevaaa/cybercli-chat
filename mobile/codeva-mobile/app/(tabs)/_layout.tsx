import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { Colors } from '@/constants/colors'
import { Icon, IconName } from '@/components/ui/Icon'

function TabIcon({ icon, label, focused }: { icon: IconName; label: string; focused: boolean }) {
  const c = Colors.dark
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 70, paddingTop: 8 }}>
      <Icon name={icon} size={22} color={focused ? c.accent : c.textDim} strokeWidth={focused ? 2.4 : 2} />
      <Text style={{ fontSize: 10.5, color: focused ? c.accent : c.textDim, marginTop: 4, fontWeight: focused ? '600' : '400' }}>{label}</Text>
    </View>
  )
}

export default function TabsLayout() {
  const c = Colors.dark
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="chat" label="Chat" focused={focused} /> }} />
      <Tabs.Screen name="discover" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="search" label="Discover" focused={focused} /> }} />
      <Tabs.Screen name="projects" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="folder" label="Projects" focused={focused} /> }} />
      <Tabs.Screen name="settings" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="settings" label="Settings" focused={focused} /> }} />
    </Tabs>
  )
}
