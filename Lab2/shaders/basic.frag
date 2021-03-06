#version 410 core

in vec3 fPosition;
in vec3 fNormal;
in vec2 fTexCoords;
in vec4 fPosEye;
in vec4 fragPosLightSpace;

out vec4 fColor;

//matrices
uniform mat4 model;
uniform mat4 view;
uniform mat3 normalMatrix;

//lighting
uniform vec3 lightDir;
uniform vec3 lightColor;

// textures
uniform sampler2D diffuseTexture;
uniform sampler2D specularTexture;
uniform sampler2D shadowMap;

//components
vec3 ambient;
float ambientStrength = 0.2f;
vec3 diffuse;
vec3 specular;
float specularStrength = 0.5f;
float shininess = 32.0f;

// attenuation coeff
float constant = 1.0f; 
float linear = 0.0045f; 
float quadratic = 0.0075f;

// tv light parameters
uniform bool isTVon;
uniform vec3 tvPos;
uniform vec3 tvLightDir;

float cutOff = 1.0f;
float outerCutOff = 0.8f;
float epsilon = 0.2f;

void computeLightComponents()
{		
	vec3 cameraPosEye = vec3(0.0f);	//in eye coordinates, the viewer is situated at the origin
	
	//transform normal
	vec3 normalEye = normalize(fNormal);	
	
	//compute light direction
	vec3 lightDirN = normalize(lightDir);
	
	//compute view direction 
	vec3 viewDirN = normalize(cameraPosEye - fPosEye.xyz);
		
	//compute distance to light 
	float dist = length(lightDir - fPosEye.xyz); 

	//compute attenuation 
	float att = 1.0f / (constant + linear * dist + quadratic * (dist * dist));

	//compute ambient light
	ambient = att * ambientStrength * lightColor;

	//compute diffuse light
	diffuse = att * max(dot(normalEye, lightDirN), 0.0f) * lightColor;

	//compute specular light
	vec3 reflection = reflect(-lightDirN, normalEye);
	float specCoeff = pow(max(dot(viewDirN, reflection), 0.0f), shininess);
	specular = att * specularStrength * specCoeff * lightColor;
}

/*
vec3 computeTVIllum(){
	vec3 cameraPosEye = vec3(0.0f);	// in eye coordinates, the viewer is situated at the origin
	vec3 normalEye = normalize(fNormal);

	vec3 tvLightDirN = normalize(tvPos - (model * vec4(fPosition, 1.0f)).xyz);
	vec3 tvDirN = normalize(tvPos.xyz - tvLightDir.xyz);

	float crtPoint = dot(tvLightDirN, normalize(tvLightDir));
	vec3 crtVec = normalize(tvLightDirN + tvDirN);

	float dist = length(tvPos - (model * vec4(fPosition, 1.0f)).xyz);

	float att = 1.0f / (constant + linear * dist + quadratic * (dist * dist));
	
	if(crtPoint > cutOff){
		//	specCoeff = dotProd of the vertex between tvPos and current computed point
		//					unless the dot product < 0 - in this case specCoeff is 0
		//				^ shininess 
		float specCoeff = pow(	max(	dot(normalize(fNormal) , crtVec), 0.0f), shininess);

		float lightIntensity = clamp((crtPoint - outerCutOff) / epsilon, 0.0f, 1.0f);

		vec3 ambientColor = vec3(0.82f, 0.84f, 0.81f) * lightIntensity * att * ambientStrength * vec3(texture(diffuseTexture, fTexCoords));
		vec3 diffuseColor = lightIntensity * att * max(dot(normalEye, tvLightDirN), 0.0f) * vec3(texture(diffuseTexture, fTexCoords));
		vec3 specularColor = vec3(0.86f, 0.9f, 0.72f) * lightIntensity * att * specularStrength * specCoeff * vec3(texture(specularTexture, fTexCoords));
	
		return ambientColor + diffuseColor + specularColor;
	}

	return vec3(0.0f);
}
*/

float computeShadow()
{
    // perform perspective divide 
    vec3 normalizedCoords = fragPosLightSpace.xyz / fragPosLightSpace.w; 
 
    if (normalizedCoords.z > 1.0f) 
	   return 0.0f;
    // Transform to [0,1] range 
    normalizedCoords = normalizedCoords * 0.5 + 0.5;
	
	// Get closest depth value from light's perspective 
    float closestDepth = texture(shadowMap, normalizedCoords.xy).r; 
	
	// Get depth of current fragment from light's perspective 
    float currentDepth = normalizedCoords.z; 
	
	// Check whether current frag pos is in shadow 
	float bias = 0.005f;
    float shadow = currentDepth - bias> closestDepth  ? 1.0f : 0.0f; 
	
	return shadow;
}

void main() 
{
	computeLightComponents();

	vec3 baseColor = vec3(0.9f, 0.35f, 0.0f);//orange

    float shadow = computeShadow(); 

    //compute final vertex color (texture + light for now)
	vec3 color = min((ambient + (1.0f - shadow) * diffuse) * texture(diffuseTexture, fTexCoords).rgb 
                    + (1.0f - shadow) * specular * texture(specularTexture, fTexCoords).rgb, 1.0f);
    //vec3 color = vec3(texture(diffuseTexture, fTexCoords));

	//if(isTVon){
		
	//}
	//color += computeTVIllum();

    fColor = vec4(color, 1.0f);
}
