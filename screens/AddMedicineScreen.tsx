// Este arquivo é o componente da tela "Adicionar Medicamento" em TSX.
import React, { useState, useEffect } from 'react'; // 'JSX' removido - CORRIGIDO
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import * as Notifications from 'expo-notifications'; // Importar expo-notifications

// Configuração para lidar com notificações quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Definindo a interface para o objeto de Medicamento
interface Medicine {
  id: string; // ID único para cada medicamento
  medicineName: string;
  dosage: string; // Quantidade de comprimidos
  frequency: string;
  time: string; // Horário no formato HH:MM
  customFrequencyDate?: string; // Data específica se a frequência for 'custom_date'
  observations: string;
  notificationId?: string; // ID da notificação agendada
}

const MEDICINES_STORAGE_KEY = '@my_medicines'; // Chave para armazenar os medicamentos no AsyncStorage

// Definindo o tipo para as props de navegação.
interface AddMedicineScreenProps {
  navigation: any; // Em um projeto real, você tiparia mais especificamente as rotas.
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

  // Solicita permissões de notificação ao carregar a tela
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

  // Função para gerar um ID único simples (para fins de exemplo)
  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Função para agendar a notificação
  const scheduleMedicineNotification = async (medicine: Medicine) => {
    let trigger: Notifications.NotificationTriggerInput;
    const [hours, minutes] = medicine.time.split(':').map(Number);

    if (medicine.frequency === 'daily') {
      trigger = {
        hour: hours,
        minute: minutes,
        repeats: true, // Repete diariamente
      };
    } else if (medicine.frequency === 'custom_date' && medicine.customFrequencyDate) {
      const [day, month, year] = medicine.customFrequencyDate.split('/').map(Number);
      const targetDate = new Date(year, month - 1, day, hours, minutes); // Mês é 0-indexado

      trigger = targetDate; // Para uma data e hora específicas, não se repete automaticamente
    } else {
      // Para 'every6hours', 'every8hours', 'weekly', etc., a lógica de agendamento é mais complexa.
      // Por enquanto, vamos agendar apenas uma notificação inicial para esses casos.
      trigger = {
        hour: hours,
        minute: minutes,
        repeats: false, // Não repete para simplicidade neste exemplo
      };
    }

    // Conteúdo da notificação
    const notificationContent: Notifications.NotificationContentInput = {
      title: `⏰ Lembrete de Medicamento: ${medicine.medicineName}`,
      body: `É hora de tomar ${medicine.dosage}.`,
      data: { medicineId: medicine.id, type: 'medicine_reminder' }, // Dados que podem ser lidos ao clicar na notificação
      sound: true, // Ativar som
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
    // Validação básica dos campos obrigatórios
    if (!medicineName || !dosage || !frequency || !time) {
      Alert.alert("Erro", "Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (frequency === 'custom_date' && !customFrequencyDate) {
      Alert.alert("Erro", "Por favor, selecione uma data para a frequência personalizada.");
      return;
    }

    // Cria o novo objeto de medicamento
    const newMedicine: Medicine = {
      id: generateUniqueId(), // Gera um ID único
      medicineName,
      dosage,
      frequency,
      time: formatTime(time), // Garante que o formato HH:MM seja salvo
      customFrequencyDate: frequency === 'custom_date' ? customFrequencyDate.toLocaleDateString('pt-BR') : undefined,
      observations,
    };

    let scheduledNotificationId: string | undefined;
    try {
      // Agendar a notificação e obter o ID
      scheduledNotificationId = await scheduleMedicineNotification(newMedicine);
      if (scheduledNotificationId) {
        newMedicine.notificationId = scheduledNotificationId; // Salva o ID da notificação no objeto
      }

      // Carrega os medicamentos existentes
      const storedMedicines = await AsyncStorage.getItem(MEDICINES_STORAGE_KEY);
      let medicinesArray: Medicine[] = storedMedicines ? JSON.parse(storedMedicines) : [];

      // Adiciona o novo medicamento ao array
      medicinesArray.push(newMedicine);

      // Salva o array atualizado de volta no AsyncStorage
      await AsyncStorage.setItem(MEDICINES_STORAGE_KEY, JSON.stringify(medicinesArray));
      
      Alert.alert("Sucesso", "Medicamento adicionado e lembrete agendado!");
      navigation.goBack(); // Volta para a tela anterior
    } catch (error) {
      console.error("Erro ao salvar medicamento ou agendar notificação:", error);
      Alert.alert("Erro", "Não foi possível adicionar o medicamento ou agendar o lembrete. Tente novamente.");
      // Se a notificação foi agendada mas o salvamento falhou, tente cancelar a notificação
      if (scheduledNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId);
      }
    }
  };

  // Helper para formatar a hora para exibição
  const formatTime = (date: Date) => {
    return date.getHours().toString().padStart(2, '0') + ':' +
           date.getMinutes().toString().padStart(2, '0');
  };

  return (
    <View style={styles.container}>
      {/* Header - Logo e Slogan (mantendo o padrão das outras telas) */}
      <View style={styles.header}>
        <Text style={styles.logoText}></Text> {/* CORRIGIDO: Texto do logo adicionado */}
        <Text style={styles.sloganText}></Text> {/* CORRIGIDO: Texto do slogan adicionado */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Novo Medicamento</Text>
            {/* Botão de fechar/voltar */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.closeButton}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Campo Nome do Medicamento */}
          <Text style={styles.label}>Nome do Medicamento 💊 *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Paracetamol"
            placeholderTextColor="#CCC"
            value={medicineName}
            onChangeText={setMedicineName}
          />

          {/* Campo Dosagem (agora para quantidade de comprimidos) */}
          <Text style={styles.label}>Quantidade de Comprimidos 🧮*</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 1 comprimido"
            placeholderTextColor="#CCC"
            value={dosage}
            onChangeText={setDosage}
            keyboardType="numeric"
          />

          {/* Campo Frequência */}
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

          {/* Exibe a data personalizada se a frequência for 'custom_date' */}
          {frequency === 'custom_date' && (
            <TouchableOpacity onPress={() => setShowCustomDatePicker(true)} style={styles.customDateDisplay}>
              <Text style={styles.customDateText}>Data Selecionada: {customFrequencyDate.toLocaleDateString('pt-BR')}</Text>
              <Text style={styles.dateIcon}>🗓️</Text>
            </TouchableOpacity>
          )}

          {/* Seletor de Data para Frequência Personalizada */}
          {showCustomDatePicker && frequency === 'custom_date' && (
            <DateTimePicker
              testID="customDatePicker"
              value={customFrequencyDate}
              mode="date"
              display="default"
              onChange={onCustomDateChange}
            />
          )}

          {/* Campo Horário */}
          <Text style={styles.label}>Horário ⏰ *</Text>
          <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeInputContainer}>
            <Text style={styles.timeInputText}>
              {formatTime(time)}
            </Text>
            <Text style={styles.timeIcon}>🕒</Text>
          </TouchableOpacity>
          
          {
          showTimePicker && (
            <DateTimePicker
              testID="timePicker"
              value={time}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )
          }

          {/* Campo Observações */}
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

          {/* Botão Adicionar Medicamento */}
          <TouchableOpacity style={styles.addButton} onPress={handleAddMedicine}>
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
    backgroundColor: '#F0F2F5', // Soft background color
  },
  dateIcon:{ // Removido pois era um estilo vazio e não utilizado.
    // CORRIGIDO: Adicionado estilo textAlign para centralizar slogan
  },
  header: {
    alignItems: 'center',
    paddingVertical: 35, // Aumentado para consistência
    backgroundColor: '#F0F2F5',
  },
  logoText: {
    fontSize: 32, // Aumentado para consistência
    fontWeight: 'bold',
    color: '#8A2BE2', // Cor original (roxo vibrante)
    marginBottom: 8, // Aumentado para consistência
  },
  sloganText: {
    fontSize: 18, // Aumentado para consistência
    color: '#666',
    textAlign: 'center' // CORRIGIDO: Adicionado para centralizar o slogan
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
    color: '#3498DB', 
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
  timeInputContainer: { // Renomeado de dateInput para timeInputContainer para consistência
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
  timeInputText: { // Renomeado de dateInputText para timeInputText
    fontSize: 18, // Aumentado
    color: '#333',
  },
  timeIcon: { // Renomeado de dateIcon para timeIcon
    fontSize: 24, // Aumentado
    color: '#888',
  },
  textArea: {
    minHeight: 100, // Aumentado
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#3498DB', 
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
  addButtonText: {
    color: '#FFF',
    fontSize: 20, // Aumentado
    fontWeight: 'bold',
  },
  customDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6E6FA', // Cor de fundo suave para o display da data
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 10, // Espaço acima
    marginBottom: 12, // Espaço abaixo
    borderWidth: 1,
    borderColor: '#CCC',
    justifyContent: 'space-between',
  },
  customDateText: {
    fontSize: 16,
    color: '#8A2BE2', // Cor do texto da data
    fontWeight: 'bold',
  },
});
