// Este arquivo é o componente da tela "Adicionar Medicamento" em TSX.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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

// Definindo a interface para o objeto de Medicamento
interface Medicine {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  time: string;
  customFrequencyDate?: string;
  observations: string;
  notificationId?: string;
}

const MEDICINES_STORAGE_KEY = '@my_medicines';

// Definindo o tipo para as props de navegação.
interface AddMedicineScreenProps {
  navigation: any;
}

export default function AddMedicineScreen({ navigation }: AddMedicineScreenProps) {
  const [medicineName, setMedicineName] = useState<string>('');
  const [dosage, setDosage] = useState<string>('');
  const [frequency, setFrequency] = useState<string>(''); 
  const [time, setTime] = useState<Date>(new Date());
  const [observations, setObservations] = useState<string>('');
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [customFrequencyDate, setCustomFrequencyDate] = useState<Date>(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);
  const route = useRoute();

  // Solicita permissões de notificação
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão de Notificação', 'Você precisa permitir as notificações para receber lembretes de medicamentos.');
      }
    })();
  }, []);

  const onTimeChange = (event: any, selectedTime: Date | undefined) => {
    setShowTimePicker(Platform.OS === 'ios'); 
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const onCustomDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowCustomDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCustomFrequencyDate(selectedDate);
    }
  };

  const handleFrequencyChange = (itemValue: string) => {
    setFrequency(itemValue);
    if (itemValue === 'custom_date') {
      if (Platform.OS === 'android' || !showCustomDatePicker) {
        setShowCustomDatePicker(true); 
      }
    }
  };

  // Gerar ID único
  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Agendar notificação
  const scheduleMedicineNotification = async (medicine: Medicine) => {
    let trigger: Notifications.NotificationTriggerInput;
    const [hours, minutes] = medicine.time.split(':').map(Number);

    if (medicine.frequency === 'daily') {
      trigger = {
        hour: hours,
        minute: minutes,
        repeats: true,
      };
    } else if (medicine.frequency === 'custom_date' && medicine.customFrequencyDate) {
      const [day, month, year] = medicine.customFrequencyDate.split('/').map(Number);
      const targetDate = new Date(year, month - 1, day, hours, minutes);
      trigger = targetDate;
    } else {
      trigger = {
        hour: hours,
        minute: minutes,
        repeats: false,
      };
    }

    const notificationContent: Notifications.NotificationContentInput = {
      title: `⏰ Lembrete de Medicamento: ${medicine.medicineName}`,
      body: `É hora de tomar ${medicine.dosage}.`,
      data: { medicineId: medicine.id, type: 'medicine_reminder' },
      sound: true,
    };

    try {
      const scheduledNotificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: trigger,
      });
      console.log('Notificação agendada com ID:', scheduledNotificationId);
      return scheduledNotificationId;
    } catch (error) {
      console.error("Erro ao agendar notificação:", error);
      Alert.alert("Erro", "Não foi possível agendar o lembrete de notificação.");
      return undefined;
    }
  };

  const handleAddMedicine = async () => {
    if (!medicineName || !dosage || !frequency || !time) {
      Alert.alert("Erro", "Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (frequency === 'custom_date' && !customFrequencyDate) {
      Alert.alert("Erro", "Por favor, selecione uma data para a frequência personalizada.");
      return;
    }

    const newMedicine: Medicine = {
      id: generateUniqueId(),
      medicineName,
      dosage,
      frequency,
      time: formatTime(time),
      customFrequencyDate: frequency === 'custom_date' ? customFrequencyDate.toLocaleDateString('pt-BR') : undefined,
      observations,
    };

    let scheduledNotificationId: string | undefined;
    try {
      scheduledNotificationId = await scheduleMedicineNotification(newMedicine);
      if (scheduledNotificationId) {
        newMedicine.notificationId = scheduledNotificationId;
      }

      const storedMedicines = await AsyncStorage.getItem(MEDICINES_STORAGE_KEY);
      let medicinesArray: Medicine[] = storedMedicines ? JSON.parse(storedMedicines) : [];
      medicinesArray.push(newMedicine);
      await AsyncStorage.setItem(MEDICINES_STORAGE_KEY, JSON.stringify(medicinesArray));
      
      Alert.alert("Sucesso", "Medicamento adicionado e lembrete agendado!");
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao salvar medicamento ou agendar notificação:", error);
      Alert.alert("Erro", "Não foi possível adicionar o medicamento ou agendar o lembrete. Tente novamente.");
      if (scheduledNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId);
      }
    }
  };

  // Formatador de hora
  const formatTime = (date: Date) => {
    return date.getHours().toString().padStart(2, '0') + ':' +
           date.getMinutes().toString().padStart(2, '0');
  };

  // Verificador de botão ativo
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
            <Text style={styles.formTitle}>Novo Medicamento</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.closeButton}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nome do Medicamento 💊 *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Paracetamol"
            placeholderTextColor="#CCC"
            value={medicineName}
            onChangeText={setMedicineName}
          />

          <Text style={styles.label}>Quantidade de Comprimidos 🧮*</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 1 comprimido"
            placeholderTextColor="#CCC"
            value={dosage}
            onChangeText={setDosage}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Frequência 📝*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={frequency}
              onValueChange={handleFrequencyChange}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Selecione a frequência" value="" enabled={false} />
              <Picker.Item label="Diário" value="daily" />
              <Picker.Item label="A cada 6 horas" value="every6hours" />
              <Picker.Item label="A cada 8 horas" value="every8hours" />
              <Picker.Item label="Uma vez por semana" value="weekly" />
              <Picker.Item label="Selecionar no calendário" value="custom_date" />
            </Picker>
          </View>

          {frequency === 'custom_date' && (
            <TouchableOpacity 
              onPress={() => setShowCustomDatePicker(true)} 
              style={styles.customDateDisplay}
            >
              <Text style={styles.customDateText}>Data Selecionada: {customFrequencyDate.toLocaleDateString('pt-BR')}</Text>
              <Text style={styles.dateIcon}>🗓️</Text>
            </TouchableOpacity>
          )}

          {showCustomDatePicker && frequency === 'custom_date' && (
            <DateTimePicker
              testID="customDatePicker"
              value={customFrequencyDate}
              mode="date"
              display="default"
              onChange={onCustomDateChange}
            />
          )}

          <Text style={styles.label}>Horário ⏰ *</Text>
          <TouchableOpacity 
            onPress={() => setShowTimePicker(true)} 
            style={styles.timeInputContainer}
          >
            <Text style={styles.timeInputText}>
              {formatTime(time)}
            </Text>
            <Text style={styles.timeIcon}>🕒</Text>
          </TouchableOpacity>
          
          {showTimePicker && (
            <DateTimePicker
              testID="timePicker"
              value={time}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}

          <Text style={styles.label}>Observações 🔎</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ex: Tomar com alimentos"
            placeholderTextColor="#CCC"
            value={observations}
            onChangeText={setObservations}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleAddMedicine}
          >
            <Text style={styles.addButtonText}>Adicionar Medicamento</Text>
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
    textAlign: 'center'
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
    color: '#3498DB',
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
  pickerContainer: {
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 55,
    width: '100%',
    color: '#333',
  },
  pickerItem: {
    fontSize: 18,
    color: '#999',
  },
  timeInputContainer: {
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
  timeInputText: {
    fontSize: 18,
    color: '#333',
  },
  timeIcon: {
    fontSize: 24,
    color: '#888',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addButton: {
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
  addButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  customDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6E6FA',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CCC',
    justifyContent: 'space-between',
  },
  customDateText: {
    fontSize: 16,
    color: '#8A2BE2',
    fontWeight: 'bold',
  },
});