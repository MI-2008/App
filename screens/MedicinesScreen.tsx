// Este arquivo é o componente da tela "Meus Medicamentos" em TSX.
import React, { useState, useEffect, useCallback, JSX } from 'react'; // 'JSX' removido
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importar AsyncStorage
import { useFocusEffect } from '@react-navigation/native'; // Para recarregar dados ao focar na tela

// Definindo o tipo para as props de navegação.
interface MedicinesScreenProps {
  navigation: any; // Em um projeto real, você tiparia mais especificamente as rotas.
}

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

const MEDICINES_STORAGE_KEY = '@my_medicines'; // Chave para armazenar os medicamentos no AsyncStorage

export default function MedicinesScreen({ navigation }: MedicinesScreenProps): JSX.Element {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Função para carregar os medicamentos do AsyncStorage
  const loadMedicines = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedMedicines = await AsyncStorage.getItem(MEDICINES_STORAGE_KEY);
      if (storedMedicines) {
        setMedicines(JSON.parse(storedMedicines));
      } else {
        setMedicines([]); // Garante que seja um array vazio se não houver nada
      }
    } catch (error) {
      console.error("Erro ao carregar medicamentos:", error);
      // Implementar um modal ou feedback visual para o usuário em caso de erro
      Alert.alert("Erro", "Não foi possível carregar seus medicamentos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Usa useFocusEffect para recarregar os medicamentos sempre que a tela é focada
  // Isso garante que a lista seja atualizada após adicionar um novo medicamento
  useFocusEffect(
    useCallback(() => {
      loadMedicines();
      return () => {
        // Opcional: qualquer limpeza ao sair do foco da tela
      };
    }, [loadMedicines])
  );

  // Função para remover um medicamento
  const removeMedicine = async (id: string) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja remover este medicamento?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Remover", 
          onPress: async () => {
            try {
              const updatedMedicines = medicines.filter(med => med.id !== id);
              await AsyncStorage.setItem(MEDICINES_STORAGE_KEY, JSON.stringify(updatedMedicines));
              setMedicines(updatedMedicines);
              Alert.alert("Sucesso", "Medicamento removido com sucesso!");
              // Futuramente: Cancelar notificações associadas a este medicamento
            } catch (error) {
              console.error("Erro ao remover medicamento:", error);
              Alert.alert("Erro", "Não foi possível remover o medicamento.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };
  return (
    <View style={styles.container}>
      {/* Header - Logo e Slogan */}
      <View style={styles.header}>
        <Text style={styles.logoText}>Lembrete MedeCon</Text>
        <Text style={styles.sloganText}>Seu assistente pessoal para medicamentos e consultas</Text>
      </View>

      {/* Navigation Bar (mantendo o padrão) */}
      <View style={styles.navigationBar}>
       <View style={styles.navRow}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Lembretes')}> {/* Navega para o Dashboard */}
                   <Text style={styles.navText}>📱Tela inicial</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MyMedicines')}> {/* Navega para Meus Medicamentos */}
                  <Text style={styles.navText}>💊 Medicamentos</Text>
                </TouchableOpacity>
        </View>

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
        <View style={styles.medicinesHeader}>
          <Text style={styles.medicinesTitle}>Meus Medicamentos</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddMedicine')}
          >
            <Text style={styles.addButtonText}>+ Adicionar Medicamento</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8A2BE2" />
            <Text style={styles.loadingText}>Carregando medicamentos...</Text>
          </View>
        ) : (
          <>
            {medicines.length === 0 ? (
              <View style={styles.noMedicinesContainer}>
                <Text style={styles.noMedicinesIcon}>💊</Text> {/* Ícone de pílula normal */}
                <Text style={styles.noMedicinesTitle}>Nenhum medicamento cadastrado</Text>
                <Text style={styles.noMedicinesText}>Adicione seu primeiro medicamento para começar!</Text>
              </View>
            ) : (
              // Lista de medicamentos
              medicines.map((medicine) => (
                <View key={medicine.id} style={styles.medicineItem}>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{medicine.medicineName}</Text>
                    <Text style={styles.medicineDetails}>
                      {medicine.dosage} - {medicine.frequency}{' '}
                      {medicine.frequency === 'custom_date' && `em ${medicine.customFrequencyDate}`}{' '}
                      às {medicine.time}
                    </Text>
                    {medicine.observations ? (
                      <Text style={styles.medicineObservations}>Obs: {medicine.observations}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity 
                    onPress={() => removeMedicine(medicine.id)}
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
    backgroundColor: '#F0F2F5', // Cor de fundo suave
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
  medicinesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  medicinesTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
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
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noMedicinesContainer: {
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
  noMedicinesIcon: {
    fontSize: 60, // Large size for the icon
    color: '#CCC', // Light gray color for the icon
    marginBottom: 15,
    transform: [{ rotate: '45deg' }], // Para simular uma pílula quebrada ou desalinhada
  },
  noMedicinesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#777',
    marginBottom: 10,
    textAlign: 'center',
  },
  noMedicinesText: {
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
  medicineItem: {
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
  medicineInfo: {
    flex: 1, // Ocupa o espaço restante
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  medicineDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  medicineObservations: {
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
