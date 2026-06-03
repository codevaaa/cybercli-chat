import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  Modal, Pressable, TextInput, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import { Icon } from '@/components/ui/Icon'
import { useProjectStore, Project } from '@/stores/projectStore'
import { useChatStore, Thread } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'

export default function ProjectsScreen() {
  const c = Colors.dark
  const { projects, hydrate, addProject, updateProject, deleteProject } = useProjectStore()
  const { addThread } = useChatStore()
  const { model } = useSettingsStore()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')

  useEffect(() => { void hydrate() }, [])

  const openNew = () => {
    setEditing(null); setName(''); setInstructions(''); setEditorOpen(true)
  }

  const openEdit = (p: Project) => {
    setEditing(p); setName(p.name); setInstructions(p.instructions); setEditorOpen(true)
  }

  const save = () => {
    if (!name.trim()) { Alert.alert('Name required', 'Give your project a name.'); return }
    if (editing) updateProject(editing.id, name.trim(), instructions.trim())
    else addProject(name.trim(), instructions.trim())
    setEditorOpen(false)
  }

  const confirmDelete = (p: Project) => {
    Alert.alert('Delete project?', `"${p.name}" and its instructions will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteProject(p.id) },
    ])
  }

  const startChat = (p: Project) => {
    const sys = p.instructions.trim()
    const t: Thread = {
      id: Date.now().toString(),
      title: p.name,
      messages: sys ? [{ id: 'sys', role: 'system', content: sys, timestamp: Date.now() }] : [],
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    addThread(t)
    router.push('/(tabs)')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: c.text }}>Projects</Text>
            <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>Workspaces with custom instructions</Text>
          </View>
          <TouchableOpacity onPress={openNew} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={22} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16, marginBottom: 20, flexDirection: 'row', gap: 12 }}>
          <Icon name="idea" size={18} color={c.accent} />
          <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 20, flex: 1 }}>
            A project bundles custom instructions Codeva follows in every chat you start from it — perfect for a coding style, a writing tone, or a domain focus.
          </Text>
        </View>

        {projects.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="folder" size={28} color={c.textDim} />
            </View>
            <Text style={{ fontSize: 15, color: c.text, fontWeight: '600', marginTop: 16 }}>No projects yet</Text>
            <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 6, textAlign: 'center', maxWidth: 260, lineHeight: 19 }}>
              Create one to give Codeva persistent context for a specific kind of work.
            </Text>
            <TouchableOpacity onPress={openNew} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22, marginTop: 22 }}>
              <Icon name="plus" size={18} color="#fff" strokeWidth={2.4} />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>New Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {projects.map((project) => (
              <View key={project.id} style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="folder" size={22} color={c.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }} numberOfLines={1}>{project.name}</Text>
                    <Text style={{ fontSize: 12, color: c.textDim, marginTop: 3 }} numberOfLines={1}>
                      {project.instructions ? project.instructions.slice(0, 50) : 'No custom instructions'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => openEdit(project)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="edit" size={16} color={c.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(project)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trash" size={16} color={c.textDim} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => startChat(project)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingVertical: 11 }}>
                  <Icon name="chat" size={16} color={c.accent} />
                  <Text style={{ fontSize: 13.5, color: c.accent, fontWeight: '600' }}>Start chat in this project</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Editor Modal */}
      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={() => setEditorOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setEditorOpen(false)}>
          <Pressable style={{ backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }} onPress={(e) => e.stopPropagation()}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 16 }}>
              {editing ? 'Edit Project' : 'New Project'}
            </Text>

            <Text style={{ fontSize: 12.5, color: c.textMuted, marginBottom: 6, fontWeight: '600' }}>NAME</Text>
            <TextInput
              style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 13, fontSize: 15, color: c.text }}
              placeholder="e.g. React Native App"
              placeholderTextColor={c.textDim}
              value={name}
              onChangeText={setName}
            />

            <Text style={{ fontSize: 12.5, color: c.textMuted, marginBottom: 6, marginTop: 16, fontWeight: '600' }}>CUSTOM INSTRUCTIONS</Text>
            <TextInput
              style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 13, fontSize: 15, color: c.text, minHeight: 120, textAlignVertical: 'top' }}
              placeholder="How should Codeva behave in this project? e.g. Always use TypeScript, prefer concise answers, follow our design system…"
              placeholderTextColor={c.textDim}
              value={instructions}
              onChangeText={setInstructions}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setEditorOpen(false)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}>
                <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} style={{ flex: 2, padding: 14, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{editing ? 'Save Changes' : 'Create Project'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
