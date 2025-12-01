""" Iterative implementation of factorial """

num = 3

ans = 1

for n in range(1, num + 1):
    ans = n * ans
    
print(ans)