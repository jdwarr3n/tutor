""" Example of list reference issue"""

x = [1, 2, 3]
y = [x, x]

print(y)

x[1] = 4

print(y)