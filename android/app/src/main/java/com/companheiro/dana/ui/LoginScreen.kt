package com.companheiro.dana.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Antes essa tela era o Material3 padrao (roxo generico, sem nada da marca).
// Jonatha pediu por varias vezes pra ela ganhar alguma identidade visual.
// Primeiro foi tentado o icone do app -- ele achou parecido demais com um
// simples logo e pediu algo diferente, tipo uma pessoa treinando. Em vez de
// carregar uma foto de verdade (precisaria de uma lib de imagem nova no
// projeto, tipo Coil, e mais superficie pra dar errado sem eu conseguir
// testar direito -- ver [[feedback-native-android-caution]]), desenha um
// pictograma simples de corredor com Canvas puro (so formas geometricas,
// API estavel do Compose, sem dependencia nova nenhuma).
@Composable
private fun RunnerGlyph(modifier: Modifier = Modifier, color: Color) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val stroke = w * 0.09f
        // Cabeca
        drawCircle(color = color, radius = w * 0.11f, center = Offset(w * 0.58f, h * 0.16f))
        // Torso (inclinado, sugerindo movimento)
        drawLine(color, Offset(w * 0.55f, h * 0.27f), Offset(w * 0.40f, h * 0.55f), strokeWidth = stroke, cap = StrokeCap.Round)
        // Braco da frente (pra cima) e de tras (pra baixo)
        drawLine(color, Offset(w * 0.50f, h * 0.34f), Offset(w * 0.68f, h * 0.20f), strokeWidth = stroke * 0.8f, cap = StrokeCap.Round)
        drawLine(color, Offset(w * 0.47f, h * 0.40f), Offset(w * 0.28f, h * 0.50f), strokeWidth = stroke * 0.8f, cap = StrokeCap.Round)
        // Perna da frente (dobrada, subindo) e perna de tras (esticada)
        drawLine(color, Offset(w * 0.40f, h * 0.55f), Offset(w * 0.55f, h * 0.68f), strokeWidth = stroke, cap = StrokeCap.Round)
        drawLine(color, Offset(w * 0.55f, h * 0.68f), Offset(w * 0.48f, h * 0.88f), strokeWidth = stroke, cap = StrokeCap.Round)
        drawLine(color, Offset(w * 0.40f, h * 0.55f), Offset(w * 0.20f, h * 0.72f), strokeWidth = stroke, cap = StrokeCap.Round)
    }
}
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
                .size(84.dp)
                .background(Color(0xFFD7ED77), shape = CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            RunnerGlyph(modifier = Modifier.size(56.dp), color = Color(0xFF214B36))
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
