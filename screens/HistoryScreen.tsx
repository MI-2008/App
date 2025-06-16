// Este arquivo é o componente da tela "Histórico de Saúde" em TSX.
import React, { useState, useEffect, useCallback, JSX } from 'react'; // 'JSX' removido
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importar AsyncStorage
import { useFocusEffect } from '@react-navigation/native'; // Para recarregar dados ao focar na tela

// Definindo a interface para o objeto de Medicamento
interface Medicine {
  id: string; // ID único para cada medicamento
  medicineName: string;
  dosage: string; // Quantidade de comprimidos
  frequency: string;
  time: string; // Horário no formato HH:MM
  customFrequencyDate?: string; // Data específica se a frequência for 'custom_date'
  observations: string;
}

// Definindo a interface para o objeto de Consulta
interface Appointment {
  id: string; // ID único para cada consulta
  doctorName: string;
  appointmentDate: string; // Data no formato local (DD/MM/AAAA)
  appointmentTime: string; // Horário no formato HH:MM
  observations: string;
}

const MEDICINES_STORAGE_KEY = '@my_medicines'; // Chave para armazenar os medicamentos no AsyncStorage
const APPOINTMENTS_STORAGE_KEY = '@my_appointments'; // Chave para armazenar as consultas no AsyncStorage

// Definindo o tipo para as props de navegação.
interface HistoryScreenProps {
  navigation: any; // 'any' type é usado para simplificar; em um projeto real, você tiparia mais especificamente.
}

export default function HistoryScreen({ navigation }: HistoryScreenProps): JSX.Element {
  const [takenMedicines, setTakenMedicines] = useState<Medicine[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper para formatar a data para exibição
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR'); // Ex: 14/06/2025
  };

  // Helper para criar um objeto Date completo a partir de data e hora
  const createDateTimeObject = (dateString: string, timeString: string): Date => {
    const [day, month, year] = dateString.split('/').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes); // Mês é 0-indexado
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
          // Para frequências diárias ou outras, consideramos o horário do dia atual
          // Se o horário já passou hoje, consideramos que foi "tomado"
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

      // Opcional: Ordenar por data (mais recente primeiro)
      pastMedicines.sort((a, b) => {
        const dateA = a.customFrequencyDate ? createDateTimeObject(a.customFrequencyDate, a.time) : new Date(); // Simplificado para fins de ordenação se não for custom_date
        const dateB = b.customFrequencyDate ? createDateTimeObject(b.customFrequencyDate, b.time) : new Date(); // Simplificado
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

  // Usa useFocusEffect para recarregar o histórico sempre que a tela é focada
  useFocusEffect(
    useCallback(() => {
      loadHistory();
      return () => {
        // Opcional: qualquer limpeza ao sair do foco da tela
      };
    }, [loadHistory])
  );

  return (
    <View style={styles.container}>
      {/* Cabeçalho - Logo e Slogan */}
      <View style={styles.header}>
        <Text style={styles.logoText}>Lembrete MedeCon</Text> {/* Ajustado conforme sua solicitação */}
        <Text style={styles.sloganText}>Seu assistente pessoal para medicamentos e consultas</Text>
      </View>

      {/* Barra de Navegação */}
      <View style={styles.navigationBar}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Lembretes')}>
            <Text style={styles.navText}>📱Tela inicial</Text> {/* Mantido conforme sua solicitação */}
          </TouchableOpacity>
          {/* O item "Medicamentos" agora é um navItem normal */}
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Medicines')}>
            <Text style={styles.navText}>💊 Medicamentos</Text>
          </TouchableOpacity>
        </View>

        {/* Segunda linha de botões */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MyAppointments')}>
            <Text style={styles.navText}>🗓️ Consultas</Text>
          </TouchableOpacity>
          <View style={styles.navItemActive}> {/* Item "Histórico" ativo */}
            <Text style={styles.navTextActive}>⏰ Histórico</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.historyTitle}>Histórico de Saúde 🩺✅</Text> {/* Ajustado font size e alinhamento */}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8A2BE2" />
            <Text style={styles.loadingText}>Carregando histórico...</Text>
          </View>
        ) : (
          <View style={styles.historyCardsContainer}>
            {/* Card: Medicamentos Tomados */}
            <View style={styles.historyCard}>
              <Text style={styles.historyCardTitle}>Medicamentos Tomados 📌</Text> {/* Ajustado font size e alinhamento */}
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
    backgroundColor: '#F0F2F5', // Cor de fundo suave
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30, // Mantido conforme seu código
    backgroundColor: '#F0F2F5',
  },
  logoText: {
    fontSize: 28, // Mantido conforme seu código
    fontWeight: 'bold',
    color: '#295700', // Mantido conforme seu código
    marginBottom: 5, // Mantido conforme seu código
    marginTop: 40, // Mantido conforme seu código
  },
  sloganText: {
    fontSize: 16, // Mantido conforme seu código
    color: '#666',
    textAlign: 'center' // Adicionado para centralizar
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
    backgroundColor: '#E6E6FA', // Fundo claro para o item ativo (lavanda)
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  navText: {
    fontSize: 20, // Mantido conforme seu código
    color: '#295700', // Mantido conforme seu código
    fontWeight: '500',
  },
  navTextActive: {
    fontSize: 20, // Mantido conforme seu código
    color: '#295700', // Mantido conforme seu código
    fontWeight: 'bold',
  },
  scrollViewContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  historyTitle: {
    fontSize: 22, // Mantido conforme seu código, mas adicionado textAlign
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center', // Adicionado para centralizar
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
    width: '100%', // Alterado para 100% para uma coluna, mais legível no mobile
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  historyCardTitle: {
    fontSize: 18, // Mantido conforme seu código, mas adicionado textAlign
    fontWeight: 'bold',
    color: '#295700', 
    marginBottom: 10,
    textAlign: 'center', // Adicionado para centralizar
  },
  historyEmptyText: {
    fontSize: 15, // Mantido conforme seu código, mas adicionado textAlign
    color: '#777',
    textAlign: 'center', // Adicionado para centralizar
    marginTop: 10,
  },
  historyItemText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
    lineHeight: 24, // Melhorar legibilidade
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
