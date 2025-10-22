import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { VALIDATION_REGEX, USER_CONSTANTS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/AppNavigator';

const schema = z.object({
  email: z.string().min(1, 'Email is required').regex(VALIDATION_REGEX.EMAIL, 'Enter a valid email'),
  password: z.string().min(USER_CONSTANTS.MIN_PASSWORD_LENGTH, `Password must be at least ${USER_CONSTANTS.MIN_PASSWORD_LENGTH} characters`),
  displayName: z
    .string()
    .min(
      USER_CONSTANTS.MIN_DISPLAY_NAME_LENGTH,
      `Display name must be at least ${USER_CONSTANTS.MIN_DISPLAY_NAME_LENGTH} characters`
    )
    .max(
      USER_CONSTANTS.MAX_DISPLAY_NAME_LENGTH,
      `Display name must be at most ${USER_CONSTANTS.MAX_DISPLAY_NAME_LENGTH} characters`
    ),
});

type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const { signUp, error } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', displayName: '' },
    mode: 'onChange',
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await signUp(values.email.trim(), values.password, values.displayName.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 12 }}>
      <Text variant="headlineSmall" style={{ marginBottom: 8 }}>Create Account</Text>

      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Display Name"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={!!errors.displayName}
          />
        )}
      />
      {errors.displayName?.message && <Text style={{ color: 'red' }}>{errors.displayName.message}</Text>}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Email"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            autoCapitalize="none"
            keyboardType="email-address"
            error={!!errors.email}
          />
        )}
      />
      {errors.email?.message && <Text style={{ color: 'red' }}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Password"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry
            autoCapitalize="none"
            error={!!errors.password}
          />
        )}
      />
      {errors.password?.message && <Text style={{ color: 'red' }}>{errors.password.message}</Text>}

      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      <Button mode="contained" loading={submitting} disabled={submitting} onPress={handleSubmit(onSubmit)}>
        Sign Up
      </Button>

      <Button onPress={() => navigation.navigate('Login')}>Already have an account? Sign in</Button>
    </View>
  );
}



