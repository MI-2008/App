// Este arquivo é o componente da tela "Adicionar Medicamento" em TSX.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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

interface AddMedicineScreenProps {
  navigation: any;
}

export default function AddMedicineScreen({ navigation }: AddMedicineScreenProps): JSX.Element {
  const [medicineName, setMedicineName] = useState<string>('');
  const [dosage, setDosage] = useState<string>('');
  const [frequency, setFrequency] = useState<string>(''); 
  const [time, setTime] = useState<Date>(new Date());
  const [observations, setObservations] = useState<string>('');
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [customFrequencyDate, setCustomFrequencyDate] = useState<Date>(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão de Notificação', 'Permita notificações para receber lembretes de medicamentos.');
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
      setShowCustomDatePicker(true);
    }
  };

  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

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
      title: `⏰ Lembrete: ${medicine.medicineName}`,
      body: `Hora de tomar ${medicine.dosage}. 💊📌`,
      data: { medicineId: medicine.id },
      sound: true,
    };

    try {
      return await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: trigger,
      });
    } catch (error) {
      console.error("Erro ao agendar notificação:", error);
      Alert.alert("Erro", "Falha ao agendar lembrete.");
      return undefined;
    }
  };

  const handleAddMedicine = async () => {
    if (!medicineName || !dosage || !frequency || !time) {
      Alert.alert("Campos obrigatórios", "Preencha todos os campos marcados com *");
      return;
    }
    if (frequency === 'custom_date' && !customFrequencyDate) {
      Alert.alert("Data necessária", "Selecione uma data para frequência personalizada");
      return;
    }

    const newMedicine: Medicine = {
      id: generateUniqueId(),
      medicineName,
      dosage,
      frequency,
      time: formatTime(time),
      customFrequencyDate: frequency === 'custom_date' 
        ? customFrequencyDate.toLocaleDateString('pt-BR') 
        : undefined,
      observations,
    };

    let scheduledNotificationId: string | undefined;
    try {
      scheduledNotificationId = await scheduleMedicineNotification(newMedicine);
      if (scheduledNotificationId) {
        newMedicine.notificationId = scheduledNotificationId;
      }

      const storedMedicines = await AsyncStorage.getItem(MEDICINES_STORAGE_KEY);
      const medicinesArray: Medicine[] = storedMedicines 
        ? JSON.parse(storedMedicines) 
        : [];

      medicinesArray.push(newMedicine);
      await AsyncStorage.setItem(MEDICINES_STORAGE_KEY, JSON.stringify(medicinesArray));
      
      Alert.alert("Sucesso", "Medicamento adicionado com sucesso 👍!");
      navigation.goBack();
    } catch (error) {
      console.error("Erro:", error);
      Alert.alert("Erro", "Falha ao adicionar medicamento 👎");
      if (scheduledNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId);
      }
    }
  };

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Novo Medicamento</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nome do Medicamento 💊 *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Paracetamol"
            placeholderTextColor="#999"
            value={medicineName}
            onChangeText={setMedicineName}
          />

          <Text style={styles.label}>Quantidade 🧮 *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 1 comprimido"
            placeholderTextColor="#999"
            value={dosage}
            onChangeText={setDosage}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Frequência 📝 *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={frequency}
              onValueChange={handleFrequencyChange}
              style={styles.picker}
            >
              <Picker.Item label="Selecione a frequência" value="" />
              <Picker.Item label="Diário" value="daily" />
              <Picker.Item label="A cada 6 horas" value="every6hours" />
              <Picker.Item label="A cada 8 horas" value="every8hours" />
              <Picker.Item label="Semanal" value="weekly" />
              <Picker.Item label="Data específica" value="custom_date" />
            </Picker>
          </View>

          {frequency === 'custom_date' && (
            <TouchableOpacity 
              onPress={() => setShowCustomDatePicker(true)} 
              style={styles.dateButton}
            >
              <Text style={styles.dateText}>
                {customFrequencyDate.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>
          )}

          {showCustomDatePicker && frequency === 'custom_date' && (
            <DateTimePicker
              value={customFrequencyDate}
              mode="date"
              display="default"
              onChange={onCustomDateChange}
            />
          )}

          <Text style={styles.label}>Horário ⏰ *</Text>
          <TouchableOpacity 
            onPress={() => setShowTimePicker(true)} 
            style={styles.dateButton}
          >
            <Text style={styles.dateText}>{formatTime(time)}</Text>
          </TouchableOpacity>
          
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}

          <Text style={styles.label}>Observações 🔎</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Ex: Tomar após refeições"
            placeholderTextColor="#999"
            value={observations}
            onChangeText={setObservations}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleAddMedicine}
          >
            <Text style={styles.buttonText}>Salvar Medicamento</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollView: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
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
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});