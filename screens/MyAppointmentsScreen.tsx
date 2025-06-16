// This file is the "My Appointments" screen component in TSX.
import React, { useState, useEffect, useCallback, JSX } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importar AsyncStorage
import { useFocusEffect } from '@react-navigation/native'; // Para recarregar dados ao focar na tela
import * as Notifications from 'expo-notifications'; // Importar expo-notifications para cancelar notificações

// Definindo o tipo para as props de navegação.
interface MyAppointmentsScreenProps {
  navigation: any; // 'any' type is used for simplicity; in a real project, you'd type it more specifically.
}

// Definindo a interface para o objeto de Consulta (consistente com ScheduleAppointmentScreen)
interface Appointment {
  id: string; // ID único para cada consulta
  doctorName: string;
  appointmentDate: string; // Data no formato local (DD/MM/AAAA)
  appointmentTime: string; // Horário no formato HH:MM
  observations: string;
  notificationId?: string; // ID da notificação agendada
}

const APPOINTMENTS_STORAGE_KEY = '@my_appointments'; // Chave para armazenar as consultas no AsyncStorage

export default function MyAppointmentsScreen({ navigation }: MyAppointmentsScreenProps): JSX.Element {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Função para carregar as consultas do AsyncStorage
  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedAppointments = await AsyncStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      if (storedAppointments) {
        setAppointments(JSON.parse(storedAppointments));
      } else {
        setAppointments([]); // Garante que seja um array vazio se não houver nada
      }
    } catch (error) {
      console.error("Erro ao carregar consultas:", error);
      Alert.alert("Erro", "Não foi possível carregar suas consultas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Usa useFocusEffect para recarregar as consultas sempre que a tela é focada
  // Isso garante que a lista seja atualizada após agendar uma nova consulta
  useFocusEffect(
    useCallback(() => {
      loadAppointments();
      return () => {
        // Opcional: qualquer limpeza ao sair do foco da tela
      };
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

  return (
    <View style={styles.container}>
      {/* Header - Logo and Slogan */}
      <View style={styles.header}>
        <Text style={styles.logoText}>Lembrete MedeCom</Text>
        <Text style={styles.sloganText}>Seu assistente pessoal para medicamentos e consultas</Text>
      </View>

{/* Navigation Bar */}
      <View style={styles.navigationBar}>
        {/* Primeira linha de botões */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Lembretes')}>
            <Text style={styles.navText}>📱Tela inicial</Text> 
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Medicines')}>
            <Text style={styles.navText}>💊 Medicamentos</Text>
          </TouchableOpacity>
        </View>

        {/* Segunda linha de botões */}
        <View style={styles.navRow}>
          <View style={styles.navItemActive}> {/* "Consultas" item active */}
            <Text style={styles.navTextActive}>🗓️ Consultas</Text>
          </View>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('History')}>
            <Text style={styles.navText}>⏰ Histórico</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.appointmentsHeader}>
          <Text style={styles.appointmentsTitle}>Minhas Consultas</Text>
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={() => navigation.navigate('ScheduleAppointment')}>          
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
    backgroundColor: '#F0F2F5', // Soft background color
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30, // Aumentado para 30 para empurrar o título para baixo
    backgroundColor: '#F0F2F5', // Header background
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#295700', // Cor vibrante para o logo (roxo)
    marginBottom: 5,
    marginTop:40,
  },
  sloganText: {
    fontSize: 16,
    color: '#666',
  },
  navigationBar: {
    flexDirection: 'column', // Alterado para coluna para as linhas de botões
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    marginBottom: 20,
    marginHorizontal: 10,
    borderRadius: 15, // Cantos arredondados para a barra de navegação
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  navRow: {
    flexDirection: 'row', // Cada linha de botões é uma linha
    justifyContent: 'space-around', // Distribui os itens igualmente
    marginBottom: 10, // Espaço entre as linhas de botões
    paddingHorizontal: 10, // Espaçamento horizontal dentro da linha
  },
  navItem: {
    flex: 1, // Faz os itens ocuparem o mesmo espaço
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20, // Mais redondo para os botões
    marginHorizontal: 5, // Espaço entre os botões na mesma linha
  },
  navItemActive: {
    flex: 1, // Faz os itens ocuparem o mesmo espaço
    alignItems: 'center',
    backgroundColor: '#E6E6FA', // Fundo claro para o item ativo (lavanda)
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20, // Mais redondo para o botão ativo
    marginHorizontal: 5, // Espaço entre os botões na mesma linha
  },
  navText: {
    fontSize: 20,
    color: '#295700',
    fontWeight: '500',
  },
  navTextActive: {
    fontSize: 20,
    color: '#295700', // Cor do texto do item ativo
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
    minHeight: 200, // Minimum height to center content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  noAppointmentsIcon: {
    fontSize: 60, // Large size for the icon
    color: '#CCC', // Light gray color for the icon
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
    flex: 1, // Ocupa o espaço restante
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
    backgroundColor: '#FF6347', // Tomate
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#FFF',
  },
});
  
