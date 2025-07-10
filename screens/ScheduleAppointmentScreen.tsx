import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface Appointment {
  id: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  observations: string;
  notificationId?: string;
}

const APPOINTMENTS_STORAGE_KEY = '@my_appointments';

interface ScheduleAppointmentScreenProps {
  navigation: any;
}

export default function ScheduleAppointmentScreen({ navigation }: ScheduleAppointmentScreenProps) {
  const [doctorName, setDoctorName] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [observations, setObservations] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Necessária', 'Ative as notificações para receber lembretes de consultas.');
      }
    })();
  }, []);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setAppointmentDate(selectedDate);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) setAppointmentTime(selectedTime);
  };

  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const scheduleNotification = async (appointment: Appointment) => {
    const [day, month, year] = appointment.appointmentDate.split('/').map(Number);
    const [hours, minutes] = appointment.appointmentTime.split(':').map(Number);
    
    const targetDate = new Date(year, month - 1, day, hours, minutes);
    
    if (targetDate.getTime() < Date.now()) {
      Alert.alert('Data Inválida', 'Não é possível agendar para datas passadas');
      return undefined;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🗓️ Consulta com ${appointment.doctorName}`,
          body: `Hoje às ${appointment.appointmentTime} - ${appointment.observations || ''}`,
          sound: true,
          data: { appointmentId: appointment.id },
        },
        trigger: targetDate,
      });
      return notificationId;
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      Alert.alert('Erro', 'Falha ao agendar lembrete');
      return undefined;
    }
  };

  const handleSchedule = async () => {
    if (!doctorName.trim()) {
      Alert.alert('Campo Obrigatório', 'Informe o nome do médico');
      return;
    }

    const newAppointment: Appointment = {
      id: generateUniqueId(),
      doctorName,
      appointmentDate: formatDate(appointmentDate),
      appointmentTime: formatTime(appointmentTime),
      observations,
    };

    let notificationId: string | undefined;
    try {
      notificationId = await scheduleNotification(newAppointment);
      if (notificationId) newAppointment.notificationId = notificationId;

      const existingAppointments = await AsyncStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      const appointments = existingAppointments ? JSON.parse(existingAppointments) : [];
      
      appointments.push(newAppointment);
      await AsyncStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
      
      Alert.alert('Sucesso!', 'Consulta agendada com lembrete');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar consulta:', error);
      Alert.alert('Erro', 'Falha ao agendar consulta');
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (time: Date) => {
    return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Agendar Consulta</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Médico 🩺 *</Text>
          <TextInput
            style={styles.input}
            placeholder="Dr. João Silva"
            placeholderTextColor="#999"
            value={doctorName}
            onChangeText={setDoctorName}
          />

          <View style={styles.datetimeContainer}>
            <View style={styles.datetimeColumn}>
              <Text style={styles.label}>Data 📅 *</Text>
              <TouchableOpacity 
                style={styles.datetimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datetimeText}>{formatDate(appointmentDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datetimeColumn}>
              <Text style={styles.label}>Horário ⏰ *</Text>
              <TouchableOpacity 
                style={styles.datetimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.datetimeText}>{formatTime(appointmentTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={appointmentDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={appointmentTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleTimeChange}
            />
          )}

          <Text style={styles.label}>Observações 💡</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Ex: Levar exames recentes"
            placeholderTextColor="#999"
            value={observations}
            onChangeText={setObservations}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSchedule}
          >
            <Text style={styles.saveButtonText}>Agendar Consulta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    fontSize: 24,
    color: '#7f8c8d',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  datetimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datetimeColumn: {
    width: '48%',
  },
  datetimeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  datetimeText: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#3498DB',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});