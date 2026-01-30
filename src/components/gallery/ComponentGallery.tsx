import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'

import { useTheme } from '../../theme'
import {
  ActionRow,
  Badge,
  Button,
  Card,
  Divider,
  IconButton,
  ScreenHeader,
  Section,
  SettingRow,
  StatCard,
  StatusDot,
  Text,
  TextInput,
} from '../ui'

function TypographyShowcase() {
  return (
    <Section title="Typography">
      <Card>
        <Text variant="heading1">Heading 1</Text>
        <Divider spacing="sm" />
        <Text variant="heading2">Heading 2</Text>
        <Divider spacing="sm" />
        <Text variant="heading3">Heading 3</Text>
        <Divider spacing="sm" />
        <Text variant="body">Body text - the default variant for regular content.</Text>
        <Divider spacing="sm" />
        <Text variant="bodySmall">Body small - for secondary content.</Text>
        <Divider spacing="sm" />
        <Text variant="caption">Caption - for timestamps and metadata.</Text>
        <Divider spacing="sm" />
        <Text variant="label">Label - for form field labels</Text>
        <Divider spacing="sm" />
        <Text variant="sectionTitle">Section Title</Text>
        <Divider spacing="sm" />
        <Text variant="mono">Monospace - for code and technical values</Text>
        <Divider spacing="md" />
        <Text variant="body" bold>
          Bold text
        </Text>
        <Text variant="body" semibold>
          Semibold text
        </Text>
        <Text variant="body" center>
          Centered text
        </Text>
        <Text variant="body" color="secondary">
          Secondary color
        </Text>
        <Text variant="body" color="error">
          Error color
        </Text>
        <Text variant="body" color="success">
          Success color
        </Text>
      </Card>
    </Section>
  )
}

function ButtonShowcase() {
  return (
    <Section title="Buttons">
      <Card>
        <Text variant="label" style={{ marginBottom: 12 }}>
          Variants
        </Text>
        <View style={{ gap: 8 }}>
          <Button title="Primary Button" variant="primary" />
          <Button title="Secondary Button" variant="secondary" />
          <Button title="Danger Button" variant="danger" />
          <Button title="Ghost Button" variant="ghost" />
        </View>
        <Divider spacing="md" />
        <Text variant="label" style={{ marginBottom: 12 }}>
          Sizes
        </Text>
        <View style={{ gap: 8 }}>
          <Button title="Small" size="sm" />
          <Button title="Medium (default)" size="md" />
          <Button title="Large" size="lg" />
        </View>
        <Divider spacing="md" />
        <Text variant="label" style={{ marginBottom: 12 }}>
          States
        </Text>
        <View style={{ gap: 8 }}>
          <Button title="Disabled" disabled />
          <Button title="Loading..." loading />
          <Button
            title="With Icon"
            icon={<Ionicons name="add-circle-outline" size={20} color="#FFF" />}
          />
        </View>
      </Card>
    </Section>
  )
}

function InputShowcase() {
  const [value, setValue] = useState('')

  return (
    <Section title="Text Inputs">
      <Card>
        <TextInput
          label="Default Input"
          placeholder="Type something..."
          value={value}
          onChangeText={setValue}
          hint="This is a helpful hint message"
        />
        <TextInput label="Password Input" placeholder="Enter password" secureTextEntry />
        <TextInput
          label="Input with Error"
          placeholder="Invalid value"
          error="This field is required"
          value="bad input"
        />
        <TextInput
          label="URL Input"
          placeholder="https://example.com"
          keyboardType="url"
          autoCapitalize="none"
        />
      </Card>
    </Section>
  )
}

function CardShowcase() {
  return (
    <Section title="Cards">
      <View style={{ gap: 12 }}>
        <Card>
          <Text variant="label">Default Card</Text>
          <Text variant="bodySmall" color="secondary">
            With border and padding
          </Text>
        </Card>
        <Card bordered={false}>
          <Text variant="label">No Border</Text>
          <Text variant="bodySmall" color="secondary">
            Just background and padding
          </Text>
        </Card>
        <Card padded={false}>
          <View style={{ padding: 16 }}>
            <Text variant="label">Custom Padding</Text>
            <Text variant="bodySmall" color="secondary">
              padded=false with manual padding
            </Text>
          </View>
        </Card>
      </View>
    </Section>
  )
}

function BadgeShowcase() {
  return (
    <Section title="Badges">
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Badge label="default" />
          <Badge label="primary" variant="primary" />
          <Badge label="success" variant="success" />
          <Badge label="error" variant="error" />
          <Badge label="warning" variant="warning" />
          <Badge label="info" variant="info" />
        </View>
      </Card>
    </Section>
  )
}

function StatusDotShowcase() {
  return (
    <Section title="Status Dots">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <StatusDot variant="success" />
            <Text variant="caption">Success</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <StatusDot variant="error" />
            <Text variant="caption">Error</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <StatusDot variant="warning" />
            <Text variant="caption">Warning</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <StatusDot variant="info" />
            <Text variant="caption">Info</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <StatusDot variant="success" pulse />
            <Text variant="caption">Pulsing</Text>
          </View>
        </View>
      </Card>
    </Section>
  )
}

function IconButtonShowcase() {
  const { theme } = useTheme()
  return (
    <Section title="Icon Buttons">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton icon="settings-outline" />
          <IconButton icon="arrow-back" />
          <IconButton icon="close" />
          <IconButton icon="send" color={theme.colors.primary} />
          <IconButton icon="settings-outline" variant="filled" />
          <IconButton icon="add" size="lg" variant="filled" />
          <IconButton icon="close" size="sm" />
        </View>
      </Card>
    </Section>
  )
}

function ActionRowShowcase() {
  return (
    <Section title="Action Rows">
      <ActionRow icon="add-circle-outline" label="New Session" onPress={() => {}} />
      <ActionRow icon="refresh-outline" label="Reset Current Session" onPress={() => {}} />
      <ActionRow icon="link-outline" label="Connect to Gateway" onPress={() => {}} />
    </Section>
  )
}

function SettingRowShowcase() {
  return (
    <Section title="Setting Rows">
      <Card padded={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <SettingRow label="Theme" value="System" onPress={() => {}} />
          <SettingRow label="Version" value="1.0.0" />
          <SettingRow label="Overview" onPress={() => {}} />
        </View>
      </Card>
    </Section>
  )
}

function StatCardShowcase() {
  return (
    <Section title="Stat Cards">
      <View style={{ gap: 12 }}>
        <StatCard
          label="INSTANCES"
          value={3}
          description="Presence beacons in the last 5 minutes."
        />
        <StatCard
          label="SESSIONS"
          value={12}
          description="Recent session keys tracked by the gateway."
        />
        <StatCard label="STATUS" value="Connected" valueColor="#34C759" />
      </View>
    </Section>
  )
}

function SectionShowcase() {
  return (
    <Section title="Sections">
      <Card>
        <Text variant="bodySmall" color="secondary">
          Sections group related content with an uppercase title header. All the groups on this page
          use the Section component. Sections can also include a right-side element for actions.
        </Text>
      </Card>
    </Section>
  )
}

function DividerShowcase() {
  return (
    <Section title="Dividers">
      <Card>
        <Text variant="bodySmall">Content above</Text>
        <Divider spacing="sm" />
        <Text variant="bodySmall">Small spacing</Text>
        <Divider spacing="md" />
        <Text variant="bodySmall">Medium spacing</Text>
        <Divider spacing="lg" />
        <Text variant="bodySmall">Large spacing</Text>
      </Card>
    </Section>
  )
}

export function ComponentGallery() {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    intro: {
      marginBottom: theme.spacing.xl,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Component Gallery" subtitle="Design system reference" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.intro}>
          <Text variant="bodySmall" color="secondary">
            Interactive catalog of all reusable UI components. Use these to build consistent
            interfaces without writing custom styles.
          </Text>
        </View>
        <TypographyShowcase />
        <ButtonShowcase />
        <InputShowcase />
        <CardShowcase />
        <BadgeShowcase />
        <StatusDotShowcase />
        <IconButtonShowcase />
        <ActionRowShowcase />
        <SettingRowShowcase />
        <StatCardShowcase />
        <SectionShowcase />
        <DividerShowcase />
      </ScrollView>
    </SafeAreaView>
  )
}
