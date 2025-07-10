// Este arquivo é o componente da tela "Lembretes" (Dashboard de Medicamentos) em TSX.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

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

// Definindo a interface para o objeto de Consulta
interface Appointment {
  id: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  observations: string;
  notificationId?: string;
}

const MEDICINES_STORAGE_KEY = '@my_medicines';
const APPOINTMENTS_STORAGE_KEY = '@my_appointments';

// Definindo o tipo para as props de navegação.
interface MedicineDashboardScreenProps {
  navigation: any;
}

export default function MedicineDashboardScreen({ navigation }: MedicineDashboardScreenProps) {
  const [todaysReminders, setTodaysReminders] = useState<any[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Função para formatar a hora para exibição
  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  // Helper para verificar se a data é hoje
  const isToday = (someDate: Date) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
  };

  // Helper para verificar se a data é no futuro
  const isFutureDate = (someDate: Date) => {
    const today = new Date();
    const dateToCheck = new Date(someDate);
    today.setHours(0, 0, 0, 0);
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck.getTime() > today.getTime();
  };

  // Função para carregar e filtrar todos os lembretes
  const loadAndFilterAllReminders = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedMedicines = await AsyncStorage.getItem(MEDICINES_STORAGE_KEY);
      const allMedicines: Medicine[] = storedMedicines ? JSON.parse(storedMedicines) : [];

      const storedAppointments = await AsyncStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      const allAppointments: Appointment[] = storedAppointments ? JSON.parse(storedAppointments) : [];

      const now = new Date();
      const todayRemindersList: any[] = [];
      const upcomingRemindersList: any[] = [];

      // Processar Medicamentos
      allMedicines.forEach(medicine => {
        const [medHours, medMinutes] = medicine.time.split(':').map(Number);
        const medicineTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), medHours, medMinutes);

        if (medicine.frequency === 'daily') {
          let nextOccurrence = new Date(medicineTimeToday);
          if (nextOccurrence.getTime() < now.getTime()) {
            nextOccurrence.setDate(nextOccurrence.getDate() + 1);
          }
          if (isToday(nextOccurrence)) {
            todayRemindersList.push({ ...medicine, type: 'medicine' });
          }
        } else if (medicine.frequency === 'custom_date' && medicine.customFrequencyDate) {
          const [day, month, year] = medicine.customFrequencyDate.split('/').map(Number);
          const customFullDate = new Date(year, month - 1, day, medHours, medMinutes);

          if (isToday(customFullDate) && customFullDate.getTime() > now.getTime()) {
            todayRemindersList.push({ ...medicine, type: 'medicine' });
          } else if (isFutureDate(customFullDate)) {
            upcomingRemindersList.push({ ...medicine, type: 'medicine' });
          }
        } else {
          if (medicineTimeToday.getTime() > now.getTime()) {
            todayRemindersList.push({ ...medicine, type: 'medicine' });
          }
        }
      });

      // Processar Consultas
      allAppointments.forEach(appointment => {
        const [day, month, year] = appointment.appointmentDate.split('/').map(Number);
        const [apptHours, apptMinutes] = appointment.appointmentTime.split(':').map(Number);
        const appointmentFullDate = new Date(year, month - 1, day, apptHours, apptMinutes);

        if (isToday(appointmentFullDate) && appointmentFullDate.getTime() > now.getTime()) {
          todayRemindersList.push({ ...appointment, type: 'appointment' });
        } else if (isFutureDate(appointmentFullDate)) {
          upcomingRemindersList.push({ ...appointment, type: 'appointment' });
        }
      });

      // Ordenar lembretes de hoje por hora
      todayRemindersList.sort((a, b) => {
        const timeA = a.type === 'medicine' ? a.time : a.appointmentTime;
        const timeB = b.type === 'medicine' ? b.time : b.appointmentTime;
        const [hA, mA] = timeA.split(':').map(Number);
        const [hB, mB] = timeB.split(':').map(Number);
        if (hA !== hB) return hA - hB;
        return mA - mB;
      });

      // Ordenar próximos lembretes por data e hora
      upcomingRemindersList.sort((a, b) => {
        const dateA = a.type === 'medicine' ? a.customFrequencyDate : a.appointmentDate;
        const timeA = a.type === 'medicine' ? a.time : a.appointmentTime;
        const [dA, moA, yA] = (dateA || '').split('/').map(Number);
        const [hA, mA] = timeA.split(':').map(Number);
        const fullDateA = new Date(yA, moA - 1, dA, hA, mA);

        const dateB = b.type === 'medicine' ? b.customFrequencyDate : b.appointmentDate;
        const timeB = b.type === 'medicine' ? b.time : b.appointmentTime;
        const [dB, moB, yB] = (dateB || '').split('/').map(Number);
        const [hB, mB] = timeB.split(':').map(Number);
        const fullDateB = new Date(yB, moB - 1, dB, hB, mB);

        return fullDateA.getTime() - fullDateB.getTime();
      });

      setTodaysReminders(todayRemindersList);
      setUpcomingReminders(upcomingRemindersList);

    } catch (error) {
      console.error("Erro ao carregar lembretes:", error);
      Alert.alert("Erro", "Não foi possível carregar seus lembretes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarregar ao focar na tela
  useFocusEffect(
    useCallback(() => {
      loadAndFilterAllReminders();
      return () => {};
    }, [loadAndFilterAllReminders])
  );

  const renderReminderItem = (item: any) => {
    if (item.type === 'medicine') {
      return (
        <View key={item.id} style={styles.reminderItem}>
          <Text style={styles.reminderTime}>{formatTime(item.time)}</Text>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderName}>💊 {item.medicineName}</Text>
            <Text style={styles.reminderDetails}>
              {item.dosage} ({item.frequency === 'custom_date' ? item.customFrequencyDate : 'Diário'})
            </Text>
            {item.observations && (
              <Text style={styles.reminderObservations}>Obs: {item.observations}</Text>
            )}
          </View>
        </View>
      );
    } else if (item.type === 'appointment') {
      return (
        <View key={item.id} style={styles.reminderItem}>
          <Text style={styles.reminderTime}>{item.appointmentDate} às {formatTime(item.appointmentTime)}</Text>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderName}>🗓️ Consulta com Dr(a). {item.doctorName}</Text>
            <Text style={styles.reminderDetails}>
              Horário: {formatTime(item.appointmentTime)}
            </Text>
            {item.observations && (
              <Text style={styles.reminderObservations}>Obs: {item.observations}</Text>
            )}
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>🟢 Lembrete MedeCon 🟢</Text>
        <Text style={styles.sloganText}>Seu assistente pessoal para medicamentos e consultas</Text>
      </View>
      
      <View style={styles.navigationBar}>
        <View style={styles.navRow}>
          <View style={styles.navItemActive}>
            <Text style={styles.navTextActive}>📱Tela inicial</Text>
          </View>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => navigation.navigate('Medicines')}
          >
            <Text style={styles.navText}>💊 Medicamentos</Text> 
          </TouchableOpacity>
        </View>
      
        <View style={styles.navRow}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => navigation.navigate('MyAppointments')}
          >
            <Text style={styles.navText}>🗓️ Consultas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.navText}>⏰ Histórico</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.dashboardTitle}>Seus Lembretes📌</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8A2BE2" />
            <Text style={styles.loadingText}>Carregando lembretes...</Text>
          </View>
        ) : (
          <>
            {/* Lembretes de Hoje */}
            <Text style={styles.sectionTitle}>Lembretes de Hoje</Text>
            {todaysReminders.length === 0 ? (
              <View style={styles.noRemindersContainer}>
                <Text style={styles.noRemindersIcon}>✨</Text>
                <Text style={styles.noRemindersText}>Nenhum lembrete para hoje por enquanto.</Text>
              </View>
            ) : (
              todaysReminders.map(renderReminderItem)
            )}

            {/* Próximos Lembretes */}
            <Text style={styles.sectionTitle}>Próximos Lembretes</Text>
            {upcomingReminders.length === 0 ? (
              <View style={styles.noRemindersContainer}>
                <Text style={styles.noRemindersIcon}>📖</Text>
                <Text style={styles.noRemindersText}>Nenhum lembrete futuro agendado.</Text>
              </View>
            ) : (
              upcomingReminders.map(renderReminderItem)
            )}
          </>
        )}
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
    fontSize: 30,
    fontWeight: 'bold',
    color: '#295700',
    marginBottom: 20,
    marginTop: 4,
  },
  sloganText: {
    fontSize: 20,
    color: '#666',
    textAlign: 'center',
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
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
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noRemindersContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 15,
  },
  noRemindersIcon: {
    fontSize: 40,
    color: '#CCC',
    marginBottom: 10,
  },
  noRemindersText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  reminderItem: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  reminderTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8A2BE2',
    minWidth: 80,
    marginRight: 10,
    textAlign: 'right',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reminderDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  reminderObservations: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 5,
  },
});