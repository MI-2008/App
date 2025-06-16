// Este arquivo é o componente da tela "Lembretes" (Dashboard de Medicamentos) em TSX.
import React, { useState, useEffect, useCallback, JSX } from 'react'; // 'JSX' removido
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importar AsyncStorage
import { useFocusEffect } from '@react-navigation/native'; // Para recarregar dados ao focar na tela

// Definindo a interface para o objeto de Medicamento (consistente com AddMedicineScreen e MedicinesScreen)
interface Medicine {
  id: string; // ID único para cada medicamento
  medicineName: string;
  dosage: string; // Quantidade de comprimidos
  frequency: string;
  time: string; // Horário no formato HH:MM (ex: "10:30")
  customFrequencyDate?: string; // Data específica se a frequência for 'custom_date' (ex: "DD/MM/AAAA")
  observations: string;
  notificationId?: string; // ID da notificação agendada
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

const MEDICINES_STORAGE_KEY = '@my_medicines'; // Chave para armazenar os medicamentos no AsyncStorage
const APPOINTMENTS_STORAGE_KEY = '@my_appointments'; // Chave para armazenar as consultas no AsyncStorage

// Definindo o tipo para as props de navegação.
interface MedicineDashboardScreenProps {
  navigation: any; // Em um projeto real, você tiparia mais especificamente as rotas.
}

export default function MedicineDashboardScreen({ navigation }: MedicineDashboardScreenProps): JSX.Element {
  const [todaysReminders, setTodaysReminders] = useState<any[]>([]); // Pode conter medicamentos e consultas
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]); // Pode conter medicamentos e consultas
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
    today.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data
    someDate.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data
    return someDate.getTime() > today.getTime();
  };

  // Função para carregar e filtrar todos os lembretes (medicamentos e consultas)
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
        const medicineTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), medHours, medMinutes, 0, 0);

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
          // Para outras frequências (e.g., 'every6hours', 'weekly') - simplificado para hoje futuro
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
          // Se for hoje e o horário ainda não passou
          todayRemindersList.push({ ...appointment, type: 'appointment' });
        } else if (isFutureDate(appointmentFullDate)) {
          // Se for uma data futura
          upcomingRemindersList.push({ ...appointment, type: 'appointment' });
        }
      });

      // Ordenar lembretes de hoje por hora (combinando medicamentos e consultas)
      todayRemindersList.sort((a, b) => {
        const timeA = a.type === 'medicine' ? a.time : a.appointmentTime;
        const timeB = b.type === 'medicine' ? b.time : b.appointmentTime;
        const [hA, mA] = timeA.split(':').map(Number);
        const [hB, mB] = timeB.split(':').map(Number);
        if (hA !== hB) return hA - hB;
        return mA - mB;
      });

      // Ordenar próximos lembretes por data e depois por hora (combinando medicamentos e consultas)
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
      console.error("Erro ao carregar e filtrar todos os lembretes:", error);
      Alert.alert("Erro", "Não foi possível carregar seus lembretes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Usa useFocusEffect para recarregar os lembretes sempre que a tela é focada
  useFocusEffect(
    useCallback(() => {
      loadAndFilterAllReminders();
      return () => {
        // Opcional: qualquer limpeza ao sair do foco da tela
      };
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
            {item.observations ? (
              <Text style={styles.reminderObservations}>Obs: {item.observations}</Text>
            ) : null}
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
            {item.observations ? (
              <Text style={styles.reminderObservations}>Obs: {item.observations}</Text>
            ) : null}
          </View>
        </View>
      );
    }
    return null; // Caso algum tipo inesperado
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>🟢 Lembrete MedeCon 🟢</Text>
        <Text style={styles.sloganText}>Seu assistente pessoal para medicamentos e consultas</Text>
      </View>
      
     <View style={styles.navigationBar}>
        <View style={styles.navRow}>
          <View style={styles.navItemActive}> {/* Item "Dashboard" ativo */}
            <Text style={styles.navTextActive}>📱Tela inicial</Text> {/* Mantido conforme sua solicitação */}
          </View>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Medicines')}>
            <Text style={styles.navText}>💊 Medicamentos</Text> 
          </TouchableOpacity>
        </View>
      
        {/* Segunda linha de botões */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MyAppointments')}>
            <Text style={styles.navText}>🗓️ Consultas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('History')}>
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
              todaysReminders.map((reminder) => renderReminderItem(reminder))
            )}

            {/* Próximos Lembretes (Medicamentos e Consultas) */}
            <Text style={styles.sectionTitle}>Próximos Lembretes</Text>
            {upcomingReminders.length === 0 ? (
              <View style={styles.noRemindersContainer}>
                <Text style={styles.noRemindersIcon}>📖</Text>
                <Text style={styles.noRemindersText}>Nenhum lembrete futuro agendado.</Text>
              </View>
            ) : (
              upcomingReminders.map((reminder) => renderReminderItem(reminder))
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
    backgroundColor: '#F0F2F5', // Cor de fundo suave, baseada na imagem
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30, // Aumentado para 30 para empurrar o título para baixo
    backgroundColor: '#F0F2F5', // Fundo do cabeçalho
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#295700', // Cor vibrante para o logo (roxo)
    marginBottom: 40,
    marginTop:49,
  },
  sloganText: {
    fontSize: 20,
    color: '#666',
    textAlign:'center'
   
  },
   dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    width: '31%', // Aproximadamente um terço da largura para 3 cards por linha
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statCardTitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 5,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#295700', // Cor do valor principal
    marginBottom: 5,
  },
  statCardIcon: {
    fontSize: 20,
    color: '#295700',
  },
  detailCardsContainer: {
    flexDirection: 'column',
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  detailCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#295700',
    marginBottom: 10,
  },
  detailCardIcon: {
    fontSize: 30,
    color: '#8A2BE2',
    marginBottom: 10,
  },
  detailCardText: {
    fontSize: 16,
    color: '#777',
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
    color: '#8A2BE2', // Cor do tempo/data do lembrete
    minWidth: 80, // Garante que o tempo tenha um espaço mínimo
    marginRight: 10,
    textAlign: 'right',
  },
  reminderInfo: {
    flex: 1, // Ocupa o espaço restante
  },
  reminderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reminderDosage: {
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
    reminderDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
