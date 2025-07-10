// Este arquivo é o componente da tela "Histórico de Saúde" em TSX.
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
}

// Definindo a interface para o objeto de Consulta
interface Appointment {
  id: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  observations: string;
}

const MEDICINES_STORAGE_KEY = '@my_medicines';
const APPOINTMENTS_STORAGE_KEY = '@my_appointments';

// Definindo o tipo para as props de navegação.
interface HistoryScreenProps {
  navigation: any;
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const [takenMedicines, setTakenMedicines] = useState<Medicine[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper para formatar a data para exibição
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  // Helper para criar um objeto Date completo
  const createDateTimeObject = (dateString: string, timeString: string): Date => {
    const [day, month, year] = dateString.split('/').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  // Função para carregar e filtrar o histórico
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedMedicines = await AsyncStorage.getItem(MEDICINES_STORAGE_KEY);
      const allMedicines: Medicine[] = storedMedicines ? JSON.parse(storedMedicines) : [];

      const storedAppointments = await AsyncStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      const allAppointments: Appointment[] = storedAppointments ? JSON.parse(storedAppointments) : [];

      const now = new Date();
      const pastMedicines: Medicine[] = [];
      const pastAppointments: Appointment[] = [];

      // Filtrar Medicamentos Tomados
      allMedicines.forEach(medicine => {
        let medicineDateTime: Date;
        if (medicine.frequency === 'custom_date' && medicine.customFrequencyDate) {
          medicineDateTime = createDateTimeObject(medicine.customFrequencyDate, medicine.time);
        } else {
          const [hours, minutes] = medicine.time.split(':').map(Number);
          medicineDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        }

        if (medicineDateTime.getTime() < now.getTime()) {
          pastMedicines.push(medicine);
        }
      });

      // Filtrar Consultas Realizadas
      allAppointments.forEach(appointment => {
        const appointmentDateTime = createDateTimeObject(appointment.appointmentDate, appointment.appointmentTime);
        if (appointmentDateTime.getTime() < now.getTime()) {
          pastAppointments.push(appointment);
        }
      });

      // Ordenar por data
      pastMedicines.sort((a, b) => {
        const dateA = a.customFrequencyDate ? 
          createDateTimeObject(a.customFrequencyDate, a.time) : new Date();
        const dateB = b.customFrequencyDate ? 
          createDateTimeObject(b.customFrequencyDate, b.time) : new Date();
        return dateB.getTime() - dateA.getTime();
      });

      pastAppointments.sort((a, b) => {
        const dateA = createDateTimeObject(a.appointmentDate, a.appointmentTime);
        const dateB = createDateTimeObject(b.appointmentDate, b.appointmentTime);
        return dateB.getTime() - dateA.getTime();
      });

      setTakenMedicines(pastMedicines);
      setCompletedAppointments(pastAppointments);

    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      Alert.alert("Erro", "Não foi possível carregar o histórico de saúde.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarregar ao focar na tela
  useFocusEffect(
    useCallback(() => {
      loadHistory();
      return () => {};
    }, [loadHistory])
  );

  return (
    <View style={styles.container}>
      {/* Cabeçalho - Logo e Slogan */}
      <View style={styles.header}>
        <Text style={styles.logoText}>✅ Histórico de Lembretes 🗃</Text>
        <Text style={styles.sloganText}></Text>
      </View>

      {/* Barra de Navegação */}
      <View style={styles.navigationBar}>
        <View style={styles.navRow}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => navigation.navigate('Lembretes')}
          >
            <Text style={styles.navText}>📱Tela inicial</Text>
          </TouchableOpacity>
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
          <View style={styles.navItemActive}>
            <Text style={styles.navTextActive}>⏰ Histórico</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.historyTitle}>✅  Histórico  ✅</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8A2BE2" />
            <Text style={styles.loadingText}>Carregando histórico...</Text>
          </View>
        ) : (
          <View style={styles.historyCardsContainer}>
            {/* Card: Medicamentos Tomados */}
            <View style={styles.historyCard}>
              <Text style={styles.historyCardTitle}>Medicamentos Tomados 📌</Text>
              {takenMedicines.length === 0 ? (
                <Text style={styles.historyEmptyText}>Nenhum medicamento tomado ainda</Text> 
              ) : (
                <View>
                  {takenMedicines.map((med, index) => (
                    <Text key={index} style={styles.historyItemText}>
                      💊 {med.medicineName} ({med.dosage}) - {med.customFrequencyDate || formatDate(new Date())} às {med.time}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Card: Consultas Realizadas */}
            <View style={styles.historyCard}>
              <Text style={styles.historyCardTitle}>Consultas Realizadas 📌</Text> 
              {completedAppointments.length === 0 ? (
                <Text style={styles.historyEmptyText}>Nenhuma consulta realizada ainda</Text> 
              ) : (
                <View>
                  {completedAppointments.map((appt, index) => (
                    <Text key={index} style={styles.historyItemText}>
                      🗓️ Consulta com Dr(a). {appt.doctorName} - {appt.appointmentDate} às {appt.appointmentTime}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
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
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  historyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  historyCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  historyCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  historyCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#295700', 
    marginBottom: 10,
    textAlign: 'center',
  },
  historyEmptyText: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
  },
  historyItemText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
    lineHeight: 24,
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
});