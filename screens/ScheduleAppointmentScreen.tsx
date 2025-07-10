// Este arquivo é o componente da tela "Agendar Consulta" em TSX.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRoute } from '@react-navigation/native';

// Configuração para lidar com notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Definindo a interface para o objeto de Consulta
interface Appointment {
  id: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  observations: string;
  notificationId?: string;
}

const APPOINTMENTS_STORAGE_KEY = '@my_appointments';

// Definindo o tipo para as props de navegação.
interface ScheduleAppointmentScreenProps {
  navigation: any;
}

export default function ScheduleAppointmentScreen({ navigation }: ScheduleAppointmentScreenProps) {
  const [doctorName, setDoctorName] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<Date>(new Date());
  const [appointmentTime, setAppointmentTime] = useState<Date>(new Date());
  const [observations, setObservations] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const route = useRoute();

  // Solicita permissões de notificação
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão de Notificação', 'Você precisa permitir as notificações para receber lembretes de consultas.');
      }
    })();
  }, []);

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(Platform.OS === 'ios'); 
    if (selectedDate) {
      setAppointmentDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime: Date | undefined) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setAppointmentTime(selectedTime);
    }
  };

  // Gerar ID único
  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Agendar notificação
  const scheduleAppointmentNotification = async (appointment: Appointment) => {
    const [day, month, year] = appointment.appointmentDate.split('/').map(Number);
    const [hours, minutes] = appointment.appointmentTime.split(':').map(Number);
    const targetDate = new Date(year, month - 1, day, hours, minutes); 

    if (targetDate.getTime() < new Date().getTime()) {
      console.warn("Não é possível agendar notificação para uma data/hora no passado.");
      return undefined;
    }

    const notificationContent: Notifications.NotificationContentInput = {
      title: `🗓️ Lembrete de Consulta: ${appointment.doctorName}`,
      body: `Sua consulta é em ${appointment.appointmentDate} às ${appointment.appointmentTime}. ${appointment.observations ? `Obs: ${appointment.observations}` : ''}`,
      data: { appointmentId: appointment.id, type: 'appointment_reminder' },
      sound: true,
    };

    try {
      const scheduledNotificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: targetDate,
      });
      console.log('Notificação de consulta agendada com ID:', scheduledNotificationId);
      return scheduledNotificationId;
    } catch (error) {
      console.error("Erro ao agendar notificação de consulta:", error);
      Alert.alert("Erro", "Não foi possível agendar o lembrete da consulta.");
      return undefined;
    }
  };

  const handleScheduleAppointment = async () => {
    if (!doctorName || !appointmentDate || !appointmentTime) {
      Alert.alert("Erro", "Por favor, preencha todos os campos obrigatórios: Nome do Médico, Data e Horário.");
      return;
    }

    const newAppointment: Appointment = {
      id: generateUniqueId(),
      doctorName,
      appointmentDate: formatDate(appointmentDate),
      appointmentTime: formatTime(appointmentTime),
      observations,
    };

    let scheduledNotificationId: string | undefined;
    try {
      scheduledNotificationId = await scheduleAppointmentNotification(newAppointment);
      if (scheduledNotificationId) {
        newAppointment.notificationId = scheduledNotificationId;
      }

      const storedAppointments = await AsyncStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      let appointmentsArray: Appointment[] = storedAppointments ? JSON.parse(storedAppointments) : [];
      appointmentsArray.push(newAppointment);
      await AsyncStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointmentsArray));
      
      Alert.alert("Sucesso", "Consulta agendada e lembrete configurado!");
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao salvar consulta ou agendar notificação:", error);
      Alert.alert("Erro", "Não foi possível agendar a consulta ou o lembrete. Tente novamente.");
      if (scheduledNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId);
      }
    }
  };

  // Helper para formatar a data
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  // Helper para formatar a hora
  const formatTime = (time: Date) => {
    return time.getHours().toString().padStart(2, '0') + ':' +
           time.getMinutes().toString().padStart(2, '0');
  };

  // Determinar se o botão está ativo
  const isActive = (routeName: string) => {
    return route.name === routeName;
  };

  return (
    <View style={styles.container}>
      {/* Header - Logo e Slogan */}
      <View style={styles.header}>
        <Text style={styles.logoText}>Lembrete MedeCon</Text>
        <Text style={styles.sloganText}>Seu assistente pessoal para medicamentos e consultas</Text>
      </View>

      {/* Barra de Navegação */}
      <View style={styles.navigationBar}>
        <View style={styles.navRow}>
          <TouchableOpacity 
            style={isActive('Lembretes') ? styles.navItemActive : styles.navItem} 
            onPress={() => navigation.navigate('Lembretes')}
          >
            <Text style={isActive('Lembretes') ? styles.navTextActive : styles.navText}>
              📱Tela inicial
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={isActive('Medicines') ? styles.navItemActive : styles.navItem} 
            onPress={() => navigation.navigate('Medicines')}
          >
            <Text style={isActive('Medicines') ? styles.navTextActive : styles.navText}>
              💊 Medicamentos
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity 
            style={isActive('MyAppointments') ? styles.navItemActive : styles.navItem} 
            onPress={() => navigation.navigate('MyAppointments')}
          >
            <Text style={isActive('MyAppointments') ? styles.navTextActive : styles.navText}>
              🗓️ Consultas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={isActive('History') ? styles.navItemActive : styles.navItem} 
            onPress={() => navigation.navigate('History')}
          >
            <Text style={isActive('History') ? styles.navTextActive : styles.navText}>
              ⏰ Histórico
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Nova Consulta</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.closeButton}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nome do Médico 🏥 🩺 *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Dr. João Silva"
            placeholderTextColor="#CCC"
            value={doctorName}
            onChangeText={setDoctorName}
          />
          
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateInputWrapper}>
              <Text style={styles.label}>Data ✏️*</Text>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(true)} 
                style={styles.dateInput}
              >
                <Text style={styles.dateInputText}>{formatDate(appointmentDate)}</Text>
                <Text style={styles.dateIcon}>🗓️</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeInputWrapper}>
              <Text style={styles.label}>Horário ⏰*</Text>
              <TouchableOpacity 
                onPress={() => setShowTimePicker(true)} 
                style={styles.timeInput}
              >
                <Text style={styles.timeInputText}>{formatTime(appointmentTime)}</Text>
                <Text style={styles.timeIcon}>🕒</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              testID="datePicker"
              value={appointmentDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
      
          {showTimePicker && (
            <DateTimePicker
              testID="timePicker"
              value={appointmentTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}

          <Text style={styles.label}>Observações💡</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ex: Levar exames anteriores"
            placeholderTextColor="#CCC"
            value={observations}
            onChangeText={setObservations}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity 
            style={styles.scheduleButton} 
            onPress={handleScheduleAppointment}
          >
            <Text style={styles.scheduleButtonText}>Agendar Consulta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#F0F2F5',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#295700',
    marginBottom: 5,
    marginTop: 40,
  },
  sloganText: {
    fontSize: 16,
    color: '#666',
  },
  navigationBar: {
    flexDirection: 'column',
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    marginBottom: 20,
    marginHorizontal: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  navItemActive: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E6E6FA',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  navText: {
    fontSize: 20,
    color: '#295700',
    fontWeight: '500',
  },
  navTextActive: {
    fontSize: 20,
    color: '#295700',
    fontWeight: 'bold',
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  closeButton: {
    fontSize: 28,
    color: '#888',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 18,
    color: '#333',
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateInputWrapper: {
    flex: 1,
    marginRight: 12,
  },
  timeInputWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EEE',
    justifyContent: 'space-between',
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EEE',
    justifyContent: 'space-between',
  },
  dateInputText: {
    fontSize: 18,
    color: '#333',
  },
  timeInputText: {
    fontSize: 18,
    color: '#333',
  },
  dateIcon: {
    fontSize: 24,
    color: '#888',
  },
  timeIcon: {
    fontSize: 24,
    color: '#888',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  scheduleButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 7,
    elevation: 10,
  },
  scheduleButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});