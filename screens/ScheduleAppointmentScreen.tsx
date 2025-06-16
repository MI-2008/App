// Este arquivo é o componente da tela "Agendar Consulta" em TSX.
import React, { useState, useEffect, JSX } from 'react'; // Adicionado useEffect
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
// import { Picker } from '@react-native-picker/picker'; // Removido, pois Especialidade foi removida
import DateTimePicker from '@react-native-community/datetimepicker'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importar AsyncStorage
import * as Notifications from 'expo-notifications'; // Importar expo-notifications

// Configuração para lidar com notificações quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Definindo a interface para o objeto de Consulta
interface Appointment {
  id: string; // ID único para cada consulta
  doctorName: string;
  // specialty: string; // Removido
  appointmentDate: string; // Data no formato local (DD/MM/AAAA)
  appointmentTime: string; // Horário no formato HH:MM
  // location: string; // Removido
  observations: string;
  notificationId?: string; // ID da notificação agendada
}

const APPOINTMENTS_STORAGE_KEY = '@my_appointments'; // Chave para armazenar as consultas no AsyncStorage

// Definindo o tipo para as props de navegação.
interface ScheduleAppointmentScreenProps {
  navigation: any; // Em um projeto real, você tiparia mais especificamente as rotas.
}

export default function ScheduleAppointmentScreen({ navigation }: ScheduleAppointmentScreenProps): JSX.Element {
  const [doctorName, setDoctorName] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<Date>(new Date());
  const [appointmentTime, setAppointmentTime] = useState<Date>(new Date());
  const [observations, setObservations] = useState<string>('');
  
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Solicita permissões de notificação ao carregar a tela
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

  // Função para gerar um ID único simples
  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Função para agendar a notificação da consulta
  const scheduleAppointmentNotification = async (appointment: Appointment) => {
    const [day, month, year] = appointment.appointmentDate.split('/').map(Number);
    const [hours, minutes] = appointment.appointmentTime.split(':').map(Number);
    
    // Mês é 0-indexado em JavaScript Date (Janeiro = 0)
    const targetDate = new Date(year, month - 1, day, hours, minutes); 

    // Verifica se a data e hora alvo já passaram
    if (targetDate.getTime() < new Date().getTime()) {
      console.warn("Não é possível agendar notificação para uma data/hora no passado.");
      return undefined; // Não agendar se já passou
    }

    const notificationContent: Notifications.NotificationContentInput = {
      title: `🗓️ Lembrete de Consulta: ${appointment.doctorName}`,
      body: `Sua consulta é em ${appointment.appointmentDate} às ${appointment.appointmentTime}. ${appointment.observations ? `Obs: ${appointment.observations}` : ''}`,
      data: { appointmentId: appointment.id, type: 'appointment_reminder' },
      sound: true,
      // Para a imagem, a notificação padrão do sistema não tem essa UI customizada.
      // Ações como "Soneca" e "Parar" podem ser configuradas, mas a visibilidade varia por OS.
      // actions: [
      //   { identifier: 'snooze', buttonTitle: 'Soneca', options: { opensApp: false } },
      //   { identifier: 'stop', buttonTitle: 'Parar', options: { opensApp: false } }
      // ],
    };

    try {
      const scheduledNotificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: targetDate, // Agendado para a data e hora exatas
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
    // Validação básica dos campos obrigatórios
    if (!doctorName || !appointmentDate || !appointmentTime) {
      Alert.alert("Erro", "Por favor, preencha todos os campos obrigatórios: Nome do Médico, Data e Horário.");
      return;
    }

    // Cria o novo objeto de consulta
    const newAppointment: Appointment = {
      id: generateUniqueId(),
      doctorName,
      appointmentDate: formatDate(appointmentDate), // Salva a data formatada
      appointmentTime: formatTime(appointmentTime), // Salva a hora formatada
      observations,
    };

    let scheduledNotificationId: string | undefined;
    try {
      // Agendar a notificação e obter o ID
      scheduledNotificationId = await scheduleAppointmentNotification(newAppointment);
      if (scheduledNotificationId) {
        newAppointment.notificationId = scheduledNotificationId; // Salva o ID da notificação no objeto
      }

      // Carrega as consultas existentes
      const storedAppointments = await AsyncStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      let appointmentsArray: Appointment[] = storedAppointments ? JSON.parse(storedAppointments) : [];

      // Adiciona a nova consulta ao array
      appointmentsArray.push(newAppointment);

      // Salva o array atualizado de volta no AsyncStorage
      await AsyncStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointmentsArray));
      
      Alert.alert("Sucesso", "Consulta agendada e lembrete configurado!");
      navigation.goBack(); // Volta para a tela anterior
    } catch (error) {
      console.error("Erro ao salvar consulta ou agendar notificação:", error);
      Alert.alert("Erro", "Não foi possível agendar a consulta ou o lembrete. Tente novamente.");
      // Se a notificação foi agendada mas o salvamento falhou, tente cancelar a notificação
      if (scheduledNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId);
      }
    }
  };

  // Helper para formatar a data para exibição
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR'); // Ex: 14/06/2025
  };

  // Helper para formatar a hora para exibição
  const formatTime = (time: Date) => {
    return time.getHours().toString().padStart(2, '0') + ':' +
           time.getMinutes().toString().padStart(2, '0');
  };

  return (
    <View style={styles.container}>
      {/* Header - Logo e Slogan (mantendo o padrão das outras telas) */}
      <View style={styles.header}>
        <Text style={styles.logoText}></Text>
        <Text style={styles.sloganText}></Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Nova Consulta</Text>
            {/* Botão de fechar/voltar */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.closeButton}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Campo Nome do Médico */}
          <Text style={styles.label}>Nome do Médico 🏥 🩺 *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Dr. João Silva"
            placeholderTextColor="#CCC"
            value={doctorName}
            onChangeText={setDoctorName}
          />
          
          {/* Campo Data e Horário */}
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateInputWrapper}>
              <Text style={styles.label}>Data ✏️*</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInput}>
                <Text style={styles.dateInputText}>{formatDate(appointmentDate)}</Text>
                <Text style={styles.dateIcon}>🗓️</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeInputWrapper}>
              <Text style={styles.label}>Horário ⏰*</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeInput}>
                <Text style={styles.timeInputText}>{formatTime(appointmentTime)}</Text>
                <Text style={styles.timeIcon}>🕒</Text>
              </TouchableOpacity>
            </View>
          </View>

          

         
          {
          showDatePicker && (
            <DateTimePicker
              testID="datePicker"
              value={appointmentDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )
          }
      
          {
          showTimePicker && (
            <DateTimePicker
              testID="timePicker"
              value={appointmentTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )
          }

          {/* Campo Observações */}
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

          {/* Botão Agendar Consulta */}
          <TouchableOpacity style={styles.scheduleButton} onPress={handleScheduleAppointment}>
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
    backgroundColor: '#F0F2F5', // Soft background color
  },
  header: {
    alignItems: 'center',
    paddingVertical: 35, // Aumentado
    backgroundColor: '#F0F2F5',
  },
  logoText: {
    fontSize: 32, // Aumentado
    fontWeight: 'bold',
    color: '#8A2BE2', // Cor original (roxo vibrante)
    marginBottom: 8, // Aumentado
  },
  sloganText: {
    fontSize: 18, // Aumentado
    color: '#666',
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center', // Centers the card on the screen
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 25, // Aumentado
    width: '100%', // Takes almost full width
    maxWidth: 400, // Limits width on larger screens for better readability
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
    marginBottom: 25, // Aumentado
  },
  formTitle: {
    fontSize: 28, // Aumentado
    fontWeight: 'bold',
    color: '#00BFFF', // Revertido para #00BFFF (azul)
  },
  closeButton: {
    fontSize: 28, // Aumentado
    color: '#888',
  },
  label: {
    fontSize: 18, // Aumentado
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10, // Aumentado
    marginTop: 20, // Aumentado
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    paddingHorizontal: 18, // Aumentado
    paddingVertical: 14, // Aumentado
    fontSize: 18, // Aumentado
    color: '#333',
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 12, // Aumentado
  },
  pickerContainer: {
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 12, // Aumentado
    overflow: 'hidden',
  },
  picker: {
    height: 55, // Aumentado
    width: '100%',
    color: '#333',
  },
  pickerItem: {
    fontSize: 18, // Aumentado
    color: '#999', // Default color for picker items
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12, // Aumentado
  },
  dateInputWrapper: {
    flex: 1,
    marginRight: 12, // Aumentado
  },
  timeInputWrapper: {
    flex: 1,
    marginLeft: 12, // Aumentado
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    paddingHorizontal: 18, // Aumentado
    paddingVertical: 14, // Aumentado
    borderWidth: 1,
    borderColor: '#EEE',
    justifyContent: 'space-between',
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    paddingHorizontal: 18, // Aumentado
    paddingVertical: 14, // Aumentado
    borderWidth: 1,
    borderColor: '#EEE',
    justifyContent: 'space-between',
  },
  dateInputText: {
    fontSize: 18, // Aumentado
    color: '#333',
  },
  timeInputText: {
    fontSize: 18, // Aumentado
    color: '#333',
  },
  dateIcon: {
    fontSize: 24, // Aumentado
    color: '#888',
  },
  timeIcon: {
    fontSize: 24, // Aumentado
    color: '#888',
  },
  textArea: {
    minHeight: 100, // Aumentado
    textAlignVertical: 'top',
  },
  scheduleButton: {
    backgroundColor: '#3498DB', // Mantido o azul para o botão
    paddingVertical: 18, // Aumentado
    borderRadius: 30, // Aumentado
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 35, // Aumentado
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 }, // Aumentado
    shadowOpacity: 0.4, // Aumentado
    shadowRadius: 7, // Aumentado
    elevation: 10, // Aumentado
  },
  scheduleButtonText: {
    color: '#FFF',
    fontSize: 20, // Aumentado
    fontWeight: 'bold',
  },
});
