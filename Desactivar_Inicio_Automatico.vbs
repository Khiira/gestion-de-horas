Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strStartupFolder = WshShell.SpecialFolders("Startup")
strShortcutPath = objFSO.BuildPath(strStartupFolder, "Gestion de Horas Pro.lnk")

If objFSO.FileExists(strShortcutPath) Then
    objFSO.DeleteFile strShortcutPath, True
    MsgBox "Se ha desactivado el inicio automático." & vbCrLf & vbCrLf & "El sistema ya no se iniciará solo al encender la PC.", 64, "Inicio Automático Desactivado"
Else
    MsgBox "El inicio automático ya estaba desactivado.", 64, "Información"
End If
