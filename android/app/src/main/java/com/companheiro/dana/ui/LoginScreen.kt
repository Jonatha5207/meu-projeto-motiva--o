package com.companheiro.dana.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.companheiro.dana.R

private val BrandDark = Color(0xFF214B36)
private val Brand = Color(0xFF366B4E)
private val Lime = Color(0xFFD7ED77)
private val Peach = Color(0xFFFFD8C1)
private val Ink = Color(0xFF17241F)
private val Muted = Color(0xFF718078)

// Antes essa tela era o Material3 padrao (roxo generico, sem nada da marca) --
// bem diferente do restante do app (site + tela de carregamento), que ja usa
// verde/limao. Como essa e a PRIMEIRA tela que a pessoa ve no app nativo (o
// WebView nunca chega a mostrar o login do site, so essa aqui), o Jonatha
// pediu por duas vezes pra ela ganhar alguma identidade visual em vez de ficar
// "seca". Reaproveita o mesmo icone do app que a tela de carregamento ja usa.
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

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = Brand,
        unfocusedBorderColor = Color(0xFFDCE4DB),
        focusedLabelColor = BrandDark,
        cursorColor = Brand,
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF3F5EF))
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 32.dp),
    ) {
        Spacer(Modifier.height(24.dp))
        Box(contentAlignment = Alignment.Center) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .background(Lime, shape = RoundedCornerShape(topStart = 55.dp, topEnd = 45.dp, bottomEnd = 48.dp, bottomStart = 52.dp)),
            )
            Box(
                modifier = Modifier
                    .padding(start = 44.dp, top = 44.dp)
                    .size(30.dp)
                    .background(Peach, shape = CircleShape),
            )
            Image(
                painter = painterResource(id = R.drawable.ic_launcher_foreground),
                contentDescription = null,
                modifier = Modifier
                    .size(60.dp)
                    .clip(RoundedCornerShape(18.dp)),
            )
        }
        Spacer(Modifier.height(28.dp))
        Text(
            "SEU COMPANHEIRO DIARIO",
            color = Brand,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            letterSpacing = 1.sp,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "Companheiro",
            color = Ink,
            fontSize = 34.sp,
            fontWeight = FontWeight.ExtraBold,
        )
        Text(
            "Sua Dana está esperando.",
            color = Muted,
            fontSize = 15.sp,
        )
        Spacer(Modifier.height(28.dp))

        if (isRegisterMode) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Nome") },
                colors = fieldColors,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
        }
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("E-mail") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            colors = fieldColors,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Senha") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            colors = fieldColors,
            shape = RoundedCornerShape(14.dp),
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
            colors = ButtonDefaults.buttonColors(containerColor = BrandDark, contentColor = Lime, disabledContainerColor = Color(0xFFDCE4DB)),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            if (isLoading) CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Lime)
            else Text(if (isRegisterMode) "Criar conta" else "Entrar", fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(8.dp))
        TextButton(onClick = { isRegisterMode = !isRegisterMode }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text(if (isRegisterMode) "Já tenho conta" else "Criar uma conta nova", color = BrandDark)
        }
        TextButton(onClick = onGuestEntry, enabled = !isLoading, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text("Só quero conhecer o app agora", color = Muted)
        }
        Spacer(Modifier.height(16.dp))
    }
}
