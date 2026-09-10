package com.companheiro.dana.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.companheiro.dana.R

// Antes essa tela era o Material3 padrao (roxo generico, sem nada da marca).
// Jonatha pediu por varias vezes pra ela ganhar alguma identidade visual --
// so o icone do app (mesmo recurso ja usado com sucesso na tela de
// carregamento, CompanheiroWebScreen.kt) dentro de um circulo verde/limao, e
// o botao principal na cor da marca em vez do roxo padrao do Compose.
// Mudanca deliberadamente pequena depois que uma tentativa anterior (mais
// ambiciosa: campos de texto customizados, forma organica assimetrica,
// scroll) derrubou o app de verdade no aparelho -- ver [[feedback-native-
// android-caution]] na memoria. O resto da tela (campos, botoes, textos)
// continua exatamente igual ao original que ja era estavel.
@Composable
fun LoginScreen(
    isLoading: Boolean,
    errorMessage: String?,
    onLogin: (email: String, password: String) -> Unit,
    onRegister: (name: String, email: String, password: String) -> Unit,
    onGuestEntry: () -> Unit,
) {
    var isRegisterMode by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .background(Color(0xFFD7ED77), shape = CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(id = R.drawable.ic_launcher_foreground),
                contentDescription = null,
                modifier = Modifier.size(48.dp),
            )
        }
        Spacer(Modifier.height(20.dp))
        Text("Companheiro", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.ExtraBold)
        Text("Sua Dana está esperando", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(24.dp))

        if (isRegisterMode) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Nome") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
        }
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("E-mail") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Senha") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(20.dp))

        if (errorMessage != null) {
            Text(errorMessage, color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(12.dp))
        }

        Button(
            onClick = { if (isRegisterMode) onRegister(name, email, password) else onLogin(email, password) },
            enabled = !isLoading && email.isNotBlank() && password.isNotBlank() && (!isRegisterMode || name.isNotBlank()),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF214B36)),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (isLoading) CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
            else Text(if (isRegisterMode) "Criar conta" else "Entrar")
        }
        Spacer(Modifier.height(8.dp))
        TextButton(onClick = { isRegisterMode = !isRegisterMode }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text(if (isRegisterMode) "Já tenho conta" else "Criar uma conta nova")
        }
        TextButton(onClick = onGuestEntry, enabled = !isLoading, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text("Só quero conhecer o app agora")
        }
    }
}
