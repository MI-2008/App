    // Este arquivo é o componente principal de navegação do seu aplicativo em TSX.
    import React, { JSX } from 'react'; // 'JSX' não é mais necessário aqui.
    import { createNativeStackNavigator } from '@react-navigation/native-stack';
    import { NavigationContainer } from '@react-navigation/native';

    // Importe todas as telas que você vai usar no navegador
    import MedicineDashboardScreen from './screens/MedicineDashboardScreen'; // O seu 'Lembretes' atual
    import MedicinesScreen from './screens/MedicinesScreen'; // A tela "Meus Medicamentos"
    import MyAppointmentsScreen from './screens/MyAppointmentsScreen'; // A tela "Minhas Consultas"
    import HistoryScreen from './screens/HistoryScreen'; // A tela "Histórico de Saúde" (erro de digitação corrigido)
    import AddMedicineScreen from './screens/AddMedicineScreen'; // A tela de adição de medicamentos
    import ScheduleAppointmentScreen from './screens/ScheduleAppointmentScreen'; // A tela de agendamento de consultas

    const Stack = createNativeStackNavigator();

    export default function AppNavigator(): JSX.Element {
      return (
        <NavigationContainer>
          {/* O aplicativo sempre iniciará na tela 'Lembretes' (Dashboard) */}
          <Stack.Navigator initialRouteName={'Lembretes'} screenOptions={{ headerShown: false }}>
            {/* A tela 'Lembretes' (Dashboard) continua sendo a tela inicial */}
            <Stack.Screen name="Lembretes" component={MedicineDashboardScreen} />
            {/* A tela de medicamentos (removida rota duplicada e mantida "Medicines" para consistência) */}
            <Stack.Screen name="Medicines" component={MedicinesScreen} />
            {/* A tela "Minhas Consultas" */}
            <Stack.Screen name="MyAppointments" component={MyAppointmentsScreen} />
            {/* A tela "Histórico de Saúde" */}
            <Stack.Screen name="History" component={HistoryScreen} />
            {/* A tela de adição de medicamentos */}
            <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
            {/* A tela de Agendar Consulta */}
            <Stack.Screen name="ScheduleAppointment" component={ScheduleAppointmentScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      );
    }
    