import { Redirect } from 'expo-router';
import { LoadingView } from '@/components/StateView';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
export default function Index() { const { user, loading } = useAuth(); if (loading) return <Screen scroll={false}><LoadingView/></Screen>; return <Redirect href={user ? '/(tabs)/discover' : '/(auth)/login'}/>; }
