// This file is the "My Appointments" screen component in TSX.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

// Definindo o tipo para as props de navegação.
interface MyAppointmentsScreenProps {
  navigation: any;
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

const APPOINTMENTS_STORAGE_KEY = '@my_appointments';

export default function MyAppointmentsScreen({ navigation }: MyAppointmentsScreenProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const route = useRoute(); // Hook para obter a rota atual

  // Função para carregar as consultas do AsyncStorage
  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedAppointments = await AsyncStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (storedAppointments) {
        setAppointments(JSON.parse(storedAppointments));
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error("Erro ao carregar consultas:", error);
      Alert.alert("Erro", "Não foi possível carregar suas consultas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarregar consultas ao focar na tela
  useFocusEffect(
    useCallback(() => {
      loadAppointments();
      return () => {};
    }, [loadAppointments])
  );

  // Função para remover uma consulta
  const removeAppointment = async (id: string, notificationId?: string) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja remover esta consulta?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Remover", 
          onPress: async () => {
            try {
              const updatedAppointments = appointments.filter(appt => appt.id !== id);
              await AsyncStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(updatedAppointments));
              setAppointments(updatedAppointments);
              
              // Cancelar a notificação se houver um ID associado
              if (notificationId) {
                await Notifications.cancelScheduledNotificationAsync(notificationId);
                console.log(`Notificação ${notificationId} cancelada.`);
              }

              Alert.alert("Sucesso", "Consulta removida com sucesso!");
            } catch (error) {
              console.error("Erro ao remover consulta:", error);
              Alert.alert("Erro", "Não foi possível remover a consulta.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // Determinar se o botão está ativo baseado na rota atual
  const isActive = (routeName: string) => {
    return route.name === routeName;
  };

  return (
    <View style={styles.container}>
      {/* Header - Logo and Slogan */}
      <View style={styles.header}>
        <Text style={styles.logoText}>🏥Lembrete Consultas🩺</Text>
        <Text style={styles.sloganText}></Text>
      </View>

      {/* Navigation Bar */}
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
        <View style={styles.appointmentsHeader}>
          <Text style={styles.appointmentsTitle}>Minhas Consultas</Text>
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={() => navigation.navigate('ScheduleAppointment')}
          >
            <Text style={styles.scheduleButtonText}>📅 Agendar Consulta</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8A2BE2" />
            <Text style={styles.loadingText}>Carregando consultas...</Text>
          </View>
        ) : (
          <>
            {appointments.length === 0 ? (
              <View style={styles.noAppointmentsContainer}>
                <Text style={styles.noAppointmentsIcon}>🗓️</Text>
                <Text style={styles.noAppointmentsTitle}>Nenhuma consulta agendada</Text>
                <Text style={styles.noAppointmentsText}>Agende sua primeira consulta para começar!</Text>
              </View>
            ) : (
              // Lista de consultas
              appointments.map((appointment) => (
                <View key={appointment.id} style={styles.appointmentItem}>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentName}>Dr(a). {appointment.doctorName}</Text>
                    <Text style={styles.appointmentDetails}>
                      {appointment.appointmentDate} às {appointment.appointmentTime}
                    </Text>
                    {appointment.observations ? (
                      <Text style={styles.appointmentObservations}>Obs: {appointment.observations}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity 
                    onPress={() => removeAppointment(appointment.id, appointment.notificationId)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
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
    fontSize: 29,
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
    backgroundColor: '#E6E6FA', // Lilás acinzentado para item ativo
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
  appointmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appointmentsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  scheduleButton: {
    backgroundColor: '#3498DB', 
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  scheduleButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noAppointmentsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  noAppointmentsIcon: {
    fontSize: 60,
    color: '#CCC',
    marginBottom: 15,
  },
  noAppointmentsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#777',
    marginBottom: 10,
    textAlign: 'center',
  },
  noAppointmentsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
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
  appointmentItem: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  appointmentObservations: {
    fontSize: 13,
    color: '#888',
    marginTop: 5,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FF6347',
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#FFF',
  },
});